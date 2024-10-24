import type { AnyCircuitElement } from "circuit-json"
import { colorMap } from "lib/utils/colors"
import { getSchematicBoundsFromCircuitJson } from "./get-schematic-bounds-from-circuit-json"
import { drawSchematicGrid } from "./draw-schematic-grid"
import { drawSchematicLabeledPoints } from "./draw-schematic-labeled-points"
import { stringify } from "svgson"
import { createSchematicComponent } from "./svg-object-fns/create-svg-objects-from-sch-component"
import { createSvgObjectsFromSchDebugObject } from "./svg-object-fns/create-svg-objects-from-sch-debug-object"

interface Options {
  width?: number
  height?: number
  grid?: boolean | { cellSize?: number; labelCells?: boolean }
  labeledPoints?: Array<{ x: number; y: number; label: string }>
}

export function convertCircuitJsonToSchematicSvg(
  soup: AnyCircuitElement[],
  options?: Options,
): string {
  const portPositions = new Map()

  // Collect port positions
  for (const item of soup) {
    if (item.type === "schematic_port") {
      portPositions.set(item.schematic_port_id, item.center)
    }
  }

  // Get bounds with padding
  const { minX, minY, maxX, maxY } = getSchematicBoundsFromCircuitJson(soup)

  const height = maxY - minY
  const flipY = (y: number) => height - (y - minY) + minY

  const svgChildren: any[] = []

  // Add grid if enabled
  if (options?.grid) {
    const gridConfig = typeof options.grid === "object" ? options.grid : {}
    svgChildren.push(drawSchematicGrid(minX, minY, maxX, maxY, gridConfig))
  }

  // Add labeled points if provided
  if (options?.labeledPoints) {
    svgChildren.push(drawSchematicLabeledPoints(options.labeledPoints))
  }

  // Process debug objects first so they appear behind components
  for (const debugObj of soup.filter(
    (item) => item.type === "schematic_debug_object",
  )) {
    const svg = createSvgObjectsFromSchDebugObject(debugObj)
    svgChildren.push(...svg)
  }

  // Process components
  const componentMap = new Map()
  for (const component of soup.filter(
    (item) => item.type === "schematic_component",
  )) {
    const flippedCenter = {
      x: component.center.x,
      y: flipY(component.center.y),
    }
    const svg = createSchematicComponent(
      flippedCenter,
      component.size,
      component.rotation || 0,
      (component as any).symbol_name,
      (component as any).port_labels,
      (component as any).source_component_id,
      (component as any).schematic_component_id,
      soup,
    )
    svgChildren.push(svg)
    componentMap.set(component.schematic_component_id, component)
  }

  // Process schematic traces
  for (const trace of soup.filter((item) => item.type === "schematic_trace")) {
    const svg = createSchematicTrace(trace, flipY, portPositions)
    if (svg) svgChildren.push(svg)
  }

  // Calculate final viewBox dimensions with additional padding
  const viewBoxPadding = 0.5
  const width = maxX - minX + 2 * viewBoxPadding
  const viewBox = `${minX - viewBoxPadding} ${minY - viewBoxPadding} ${width} ${height + 2 * viewBoxPadding}`

  const svgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox,
      width: options?.width ?? "1200",
      height: options?.height ?? "600",
      style: `background-color: ${colorMap.schematic.background}`,
    },
    children: [
      {
        name: "style",
        type: "element",
        children: [
          {
            type: "text",
            value: `
              .component { fill: none; stroke: ${colorMap.schematic.component_outline}; stroke-width: 0.03; }
              .chip { fill: ${colorMap.schematic.component_body}; stroke: ${colorMap.schematic.component_outline}; stroke-width: 0.03; }
              .component-pin { fill: none; stroke: ${colorMap.schematic.component_outline}; stroke-width: 0.02; }
              .trace { stroke: ${colorMap.schematic.wire}; stroke-width: 0.02; fill: none; }
              .text { font-family: Arial, sans-serif; font-size: 0.2px; fill: ${colorMap.schematic.wire}; }
              .pin-number { font-size: 0.15px; fill: ${colorMap.schematic.pin_number}; }
              .port-label { fill: ${colorMap.schematic.reference}; }
              .component-name { font-size: 0.25px; fill: ${colorMap.schematic.reference}; }
            `,
          },
        ],
      },
      ...svgChildren,
    ],
  }

  return stringify({
    value: "",
    ...svgObject,
    attributes: {
      ...svgObject.attributes,
      width: svgObject.attributes.width.toString(),
      height: svgObject.attributes.height.toString(),
    },
  })

  function createSchematicTrace(
    trace: any,
    flipY: (y: number) => number,
    portPositions: Map<string, { x: number; y: number }>,
  ): any {
    const edges = trace.edges
    if (edges.length === 0) return null

    let path = ""

    // Process all edges
    edges.forEach((edge: any, index: number) => {
      const fromPoint =
        edge.from.ti !== undefined ? portPositions.get(edge.from.ti) : edge.from
      const toPoint =
        edge.to.ti !== undefined ? portPositions.get(edge.to.ti) : edge.to

      if (!fromPoint || !toPoint) {
        return
      }

      const fromCoord = `${fromPoint.x - 0.15} ${flipY(fromPoint.y)}`
      const toCoord = `${toPoint.x + 0.15} ${flipY(toPoint.y)}`

      if (index === 0) {
        path += `M ${fromCoord} L ${toCoord}`
      } else {
        path += ` L ${toCoord}`
      }
    })

    // Handle connection to final port if needed
    if (trace.to_schematic_port_id) {
      const finalPort = portPositions.get(trace.to_schematic_port_id)
      if (finalPort) {
        const lastFromPoint = path.split("M")[1]?.split("L")[0]
        const lastEdge = edges[edges.length - 1]
        const lastPoint =
          lastEdge.to.ti !== undefined
            ? portPositions.get(lastEdge.to.ti)
            : lastEdge.to
        if (lastPoint.x !== finalPort.x || lastPoint.y !== finalPort.y) {
          const finalCoord = `${finalPort.x} ${flipY(finalPort.y)}`
          path += ` M ${lastFromPoint} L ${finalCoord}`
        }
      }
    }

    return path
      ? {
          name: "path",
          type: "element",
          attributes: {
            class: "trace",
            d: path,
          },
        }
      : null
  }
}

/**
 * @deprecated use `convertCircuitJsonToSchematicSvg` instead
 */
export const circuitJsonToSchematicSvg = convertCircuitJsonToSchematicSvg
