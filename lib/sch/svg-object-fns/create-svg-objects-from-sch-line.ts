import type { SchematicLine } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"

export function createSvgObjectsFromSchematicLine({
  schLine,
  transform,
  colorMap,
}: {
  schLine: SchematicLine
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  const p1 = applyToPoint(transform, { x: schLine.x1, y: schLine.y1 })
  const p2 = applyToPoint(transform, { x: schLine.x2, y: schLine.y2 })

  const strokeWidth = schLine.stroke_width ?? 0.02
  const transformedStrokeWidth = Math.abs(transform.a) * strokeWidth

  return [
    {
      name: "line",
      type: "element",
      attributes: {
        x1: p1.x.toString(),
        y1: p1.y.toString(),
        x2: p2.x.toString(),
        y2: p2.y.toString(),
        stroke: schLine.color,
        "stroke-width": transformedStrokeWidth.toString(),
        ...(schLine.is_dashed && {
          "stroke-dasharray": (transformedStrokeWidth * 3).toString(),
        }),
        "data-schematic-line-id": schLine.schematic_line_id,
        ...(schLine.schematic_component_id && {
          "data-schematic-component-id": schLine.schematic_component_id,
        }),
      },
      children: [],
      value: "",
    },
  ]
}
