import type { SchematicCircle } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"

export function createSvgObjectsFromSchematicCircle({
  schCircle,
  transform,
  colorMap,
}: {
  schCircle: SchematicCircle
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  if (
    !schCircle.center ||
    !Number.isFinite(schCircle.center.x) ||
    !Number.isFinite(schCircle.center.y) ||
    !Number.isFinite(schCircle.radius) ||
    schCircle.radius <= 0
  ) {
    return []
  }

  const center = applyToPoint(transform, schCircle.center)
  const transformedRadius = Math.abs(transform.a) * schCircle.radius

  const strokeWidth =
    typeof schCircle.stroke_width === "number" &&
    Number.isFinite(schCircle.stroke_width) &&
    schCircle.stroke_width >= 0
      ? schCircle.stroke_width
      : 0.02
  const transformedStrokeWidth = Math.abs(transform.a) * strokeWidth

  return [
    {
      name: "circle",
      type: "element",
      attributes: {
        class: "sch-circle",
        cx: center.x.toString(),
        cy: center.y.toString(),
        r: transformedRadius.toString(),
        fill: schCircle.is_filled
          ? (schCircle.fill_color ?? schCircle.color)
          : "none",
        stroke: schCircle.color,
        "stroke-width": transformedStrokeWidth.toString(),
        ...(schCircle.is_dashed && {
          "stroke-dasharray": (transformedStrokeWidth * 3).toString(),
        }),
        "data-schematic-circle-id": schCircle.schematic_circle_id,
        ...(schCircle.schematic_component_id && {
          "data-schematic-component-id": schCircle.schematic_component_id,
        }),
      },
      children: [],
      value: "",
    },
  ]
}
