import type { AnyCircuitElement } from "circuit-json"
import { colorMap } from "lib/utils/colors"
import { drawSchematicGrid } from "./draw-schematic-grid"
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
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  const portSize = 0.2
  const portPositions = new Map()

  // First pass: find the bounds and collect port positions
  for (const item of soup) {
    if (item.type === "schematic_component") {
      updateBounds(item.center, item.size, item.rotation || 0)
    } else if (item.type === "schematic_port") {
      updateBounds(item.center, { width: portSize, height: portSize }, 0)
      portPositions.set(item.schematic_port_id, item.center)
    } else if (item.type === "schematic_debug_object") {
      if (item.shape === "rect") {
        updateBounds(item.center, item.size, 0)
      } else if (item.shape === "line") {
        updateBounds(item.start, { width: 0.1, height: 0.1 }, 0)
        updateBounds(item.end, { width: 0.1, height: 0.1 }, 0)
      }
    }
  }

  // Add padding to bounds
  const padding = 0.5
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

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
    const labeledPointsGroup: any[] = []

    for (const point of options.labeledPoints) {
      // Add X marker
      labeledPointsGroup.push({
        name: "path",
        type: "element",
        attributes: {
          d: `M${point.x - 0.1},${point.y - 0.1} L${point.x + 0.1},${point.y + 0.1} M${point.x - 0.1},${point.y + 0.1} L${point.x + 0.1},${point.y - 0.1}`,
          stroke: colorMap.schematic.grid,
          "stroke-width": "0.02",
          "stroke-opacity": "0.7",
        },
      })

      // Add label
      labeledPointsGroup.push({
        name: "text",
        type: "element",
        attributes: {
          x: (point.x + 0.15).toString(),
          y: (point.y - 0.15).toString(),
          fill: colorMap.schematic.grid,
          "font-size": "0.15",
          "fill-opacity": "0.7",
        },
        children: [
          {
            type: "text",
            value: point.label || `(${point.x},${point.y})`,
            name: "",
            attributes: {},
            children: [],
          },
        ],
      })
    }

    svgChildren.push({
      name: "g",
      type: "element",
      attributes: { class: "labeled-points" },
      children: labeledPointsGroup,
    })
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
  const viewBoxPadding = 1
  const width = maxX - minX + 2 * padding
  const viewBox = `${minX - padding} ${minY - padding} ${width} ${height + 2 * padding}`

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

  function updateBounds(center: any, size: any, rotation: number) {
    const corners = [
      { x: -size.width / 2, y: -size.height / 2 },
      { x: size.width / 2, y: -size.height / 2 },
      { x: size.width / 2, y: size.height / 2 },
      { x: -size.width / 2, y: size.height / 2 },
    ]

    for (const corner of corners) {
      const rotatedX =
        corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation) + center.x
      const rotatedY =
        corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation) + center.y
      minX = Math.min(minX, rotatedX)
      minY = Math.min(minY, rotatedY)
      maxX = Math.max(maxX, rotatedX)
      maxY = Math.max(maxY, rotatedY)
    }
  }
}

/**
 * @deprecated use `convertCircuitJsonToSchematicSvg` instead
 */
export const circuitJsonToSchematicSvg = convertCircuitJsonToSchematicSvg
