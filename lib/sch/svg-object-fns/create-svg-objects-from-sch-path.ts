import type { SchematicPath } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"
import { getSchematicStrokeDasharray } from "./get-schematic-stroke-dasharray"

export function createSvgObjectsFromSchematicPath({
  schPath,
  transform,
  colorMap,
}: {
  schPath: SchematicPath
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  const strokeColor =
    schPath.stroke_color ?? colorMap.schematic.component_outline
  const fillColor = schPath.fill_color ?? "none"
  const strokeWidth = schPath.stroke_width ?? 0.02
  const transformedStrokeWidth = Math.abs(transform.a) * strokeWidth
  const strokeDasharray = getSchematicStrokeDasharray({
    isDashed: schPath.is_dashed,
    dashLength: schPath.dash_length,
    dashGap: schPath.dash_gap,
    strokeWidth,
    transform,
  })

  if (!schPath.points || schPath.points.length < 2) {
    return []
  }

  const transformedPoints = schPath.points.map((p) =>
    applyToPoint(transform, { x: p.x, y: p.y }),
  )

  // Build SVG path d attribute
  const pathD = transformedPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ")

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: "sch-path",
        d: pathD,
        stroke: strokeColor,
        "stroke-width": transformedStrokeWidth.toString(),
        fill: schPath.is_filled ? fillColor : "none",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        ...(strokeDasharray && {
          "stroke-dasharray": strokeDasharray,
        }),
        ...(schPath.schematic_component_id && {
          "data-schematic-component-id": schPath.schematic_component_id,
        }),
      },
      children: [],
      value: "",
    },
  ]
}
