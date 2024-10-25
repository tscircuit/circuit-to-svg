import type { AnyCircuitElement } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { stringify } from "svgson"
import {
  applyToPoint,
  compose,
  scale,
  translate,
  type Matrix,
} from "transformation-matrix"
import { drawSchematicGrid } from "./draw-schematic-grid"
import { drawSchematicLabeledPoints } from "./draw-schematic-labeled-points"
import { getSchematicBoundsFromCircuitJson } from "./get-schematic-bounds-from-circuit-json"
import { createSchematicComponent } from "./svg-object-fns/create-svg-objects-from-sch-component"
import { createSvgObjectsFromSchDebugObject } from "./svg-object-fns/create-svg-objects-from-sch-debug-object"
import { createSchematicTrace } from "./svg-object-fns/create-svg-objects-from-sch-trace"

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
  // Get bounds with padding
  const bounds = getSchematicBoundsFromCircuitJson(circuitJson)
  const { minX, minY, maxX, maxY } = bounds

  const padding = 1 // Reduced padding for tighter boundary
  const circuitWidth = maxX - minX + 2 * padding
  const circuitHeight = maxY - minY + 2 * padding

  const svgWidth = options?.width ?? 1200
  const svgHeight = options?.height ?? 600

  // Calculate scale factor to fit circuit within SVG, maintaining aspect ratio
  const scaleX = svgWidth / circuitWidth
  const scaleY = svgHeight / circuitHeight
  const scaleFactor = Math.min(scaleX, scaleY)

  // Calculate centering offsets
  const offsetX = (svgWidth - circuitWidth * scaleFactor) / 2
  const offsetY = (svgHeight - circuitHeight * scaleFactor) / 2

  // Create transform matrix
  const transform = compose(
    translate(
      offsetX - minX * scaleFactor + padding * scaleFactor,
      svgHeight - offsetY + minY * scaleFactor - padding * scaleFactor,
    ),
    scale(scaleFactor, scaleFactor),
  )

  const svgChildren: SvgObject[] = []

  // Add background rectangle
  svgChildren.push({
    name: "rect",
    type: "element",
    attributes: {
      class: "boundary",
      x: "0",
      y: "0",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
    },
    children: [],
    value: "",
  })

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

  // Process all elements using transform
  for (const elm of circuitJson) {
    if (elm.type === "schematic_debug_object") {
      schDebugObjectSvgs.push(
        ...createSvgObjectsFromSchDebugObject(elm, transform),
      )
    } else if (elm.type === "schematic_component") {
      schComponentSvgs.push(
        ...createSchematicComponent({
          component: elm,
          transform,
          circuitJson,
        }),
      )
    } else if (elm.type === "schematic_trace") {
      schTraceSvgs.push(...createSchematicTrace(elm, transform))
    }
  }

  // Add elements in correct order
  svgChildren.push(...schDebugObjectSvgs, ...schComponentSvgs, ...schTraceSvgs)

  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: svgWidth.toString(),
      height: svgHeight.toString(),
      style: `background-color: ${colorMap.schematic.background}`,
    },
    children: [
      // Add styles
      {
        name: "style",
        type: "element",
        children: [
          {
            type: "text",
            value: `
              .boundary { fill: ${colorMap.schematic.background}; }
              .schematic-boundary { fill: none; stroke: #fff; stroke-width: 0.3; }
              .component { fill: none; stroke: ${colorMap.schematic.component_outline}; }
              .chip { fill: ${colorMap.schematic.component_body}; stroke: ${colorMap.schematic.component_outline}; }
              .component-pin { fill: none; stroke: ${colorMap.schematic.component_outline}; }
              .trace { stroke: ${colorMap.schematic.wire}; stroke-width: ${0.02 * scaleFactor}; fill: none; }
              .text { font-family: Arial, sans-serif; font-size: ${0.2 * scaleFactor}px; fill: ${colorMap.schematic.wire}; }
              .pin-number { font-size: ${0.15 * scaleFactor}px; fill: ${colorMap.schematic.pin_number}; }
              .port-label { fill: ${colorMap.schematic.reference}; }
              .component-name { font-size: ${0.25 * scaleFactor}px; fill: ${colorMap.schematic.reference}; }
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

  return stringify(svgObject)
}

/**
 * @deprecated use `convertCircuitJsonToSchematicSvg` instead
 */
export const circuitJsonToSchematicSvg = convertCircuitJsonToSchematicSvg
