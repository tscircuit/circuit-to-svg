import type { AnyCircuitElement } from "circuit-json"
import { colorMap } from "lib/utils/colors"
import { getSchematicBoundsFromCircuitJson } from "./get-schematic-bounds-from-circuit-json"
import { drawSchematicGrid } from "./draw-schematic-grid"
import { drawSchematicLabeledPoints } from "./draw-schematic-labeled-points"
import { stringify } from "svgson"
import { createSchematicComponent } from "./svg-object-fns/create-svg-objects-from-sch-component"
import { createSvgObjectsFromSchDebugObject } from "./svg-object-fns/create-svg-objects-from-sch-debug-object"
import { createSchematicTrace } from "./svg-object-fns/create-svg-objects-from-sch-trace"
import type { SvgObject } from "lib/svg-object"
import { identity } from "transformation-matrix"

interface Options {
  width?: number
  height?: number
  grid?: boolean | { cellSize?: number; labelCells?: boolean }
  labeledPoints?: Array<{ x: number; y: number; label: string }>
}

export function convertCircuitJsonToSchematicSvg(
  circuitJson: AnyCircuitElement[],
  options?: Options,
): string {
  /**
   * @deprecated use su(circuitJson).get(port_id).center, portPositions should
   * be removed
   */
  const portPositions = new Map()

  // Collect port positions
  for (const item of circuitJson) {
    if (item.type === "schematic_port") {
      portPositions.set(item.schematic_port_id, item.center)
    }
  }

  // Get bounds with padding
  const bounds = getSchematicBoundsFromCircuitJson(circuitJson)
  const { minX, minY, maxX, maxY } = bounds

  // Calculate final viewBox dimensions with additional padding
  const viewBoxPadding = 0.5
  const width = maxX - minX + 2 * viewBoxPadding
  const height = maxY - minY
  const viewBox = `${minX - viewBoxPadding} ${minY - viewBoxPadding} ${width} ${height + 2 * viewBoxPadding}`

  /**
   * @deprecated use `transform` instead, flipY should be removed
   */
  const flipY = (y: number) => height - (y - minY) + minY

  /**
   * The transform represents the transformation from the "schematic coordinate
   * space" to the "pixel coordinate space" or "screen space". In other words,
   * the transform takes a chip with a center at (5, 5) and moves it to
   * something like (400, 400) on the screen.
   *
   * When we switch to transform _you should not set the SVG viewport_!!! Since
   * we're going directly to screen space, there is no need for a viewport!!!
   */
  const transform = identity() // TODO compute transform

  const svgChildren: SvgObject[] = []

  // Add grid if enabled
  if (options?.grid) {
    const gridConfig = typeof options.grid === "object" ? options.grid : {}
    svgChildren.push(drawSchematicGrid({ bounds, transform, ...gridConfig }))
  }

  // Add labeled points if provided
  if (options?.labeledPoints) {
    svgChildren.push(
      drawSchematicLabeledPoints({
        points: options.labeledPoints,
        transform,
      }),
    )
  }

  const schDebugObjectSvgs: SvgObject[] = []
  const schComponentSvgs: SvgObject[] = []
  const schTraceSvgs: SvgObject[] = []

  for (const elm of circuitJson) {
    if (elm.type === "schematic_debug_object") {
      schDebugObjectSvgs.push(...createSvgObjectsFromSchDebugObject(elm))
    } else if (elm.type === "schematic_component") {
      schComponentSvgs.push(
        ...createSchematicComponent({
          component: {
            ...elm,
            center: { x: elm.center.x, y: flipY(elm.center.y) },
          },
          transform, // Add the missing transform property
          circuitJson,
        }),
      )
    } else if (elm.type === "schematic_trace") {
      schTraceSvgs.push(...createSchematicTrace(elm, flipY, portPositions))
    }
  }

  svgChildren.push(...schDebugObjectSvgs, ...schComponentSvgs, ...schTraceSvgs)

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox,
      width: (options?.width ?? 1200).toString(),
      height: (options?.height ?? 600).toString(),
      style: `background-color: ${colorMap.schematic.background}`,
    },
    children: [
      {
        name: "style",
        type: "element",
        children: [
          {
            type: "text",
            // Avoid using classes, prefer directly styling svg objects
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
            name: "",
            attributes: {},
            children: [],
          },
        ],
        value: "",
        attributes: {},
      },
      ...svgChildren,
    ],
    value: "",
  }

  return stringify({
    ...svgObject,
    attributes: {
      ...svgObject.attributes,
      width: svgObject.attributes.width?.toString()!,
      height: svgObject.attributes.height?.toString()!,
    },
  })
}

/**
 * @deprecated use `convertCircuitJsonToSchematicSvg` instead
 */
export const circuitJsonToSchematicSvg = convertCircuitJsonToSchematicSvg
