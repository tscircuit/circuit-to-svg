import type { SchematicRect } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, compose, translate, rotate } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"

export function createSvgObjectsFromSchematicRect({
  schRect,
  transform,
  colorMap,
}: {
  schRect: SchematicRect
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  const center = applyToPoint(transform, schRect.center)
  const transformedWidth = Math.abs(transform.a) * schRect.width
  const transformedHeight = Math.abs(transform.d) * schRect.height

  const strokeWidth = schRect.stroke_width ?? 0.02
  const transformedStrokeWidth = Math.abs(transform.a) * strokeWidth

  // Calculate top-left position of rectangle
  const x = center.x - transformedWidth / 2
  const y = center.y - transformedHeight / 2

  const svgRect: SvgObject = {
    name: "rect",
    type: "element",
    attributes: {
      x: x.toString(),
      y: y.toString(),
      width: transformedWidth.toString(),
      height: transformedHeight.toString(),
      fill: schRect.is_filled ? (schRect.fill_color ?? schRect.color) : "none",
      stroke: schRect.color,
      "stroke-width": transformedStrokeWidth.toString(),
      ...(schRect.is_dashed && {
        "stroke-dasharray": (transformedStrokeWidth * 3).toString(),
      }),
      ...(schRect.rotation !== 0 && {
        transform: `rotate(${schRect.rotation} ${center.x} ${center.y})`,
      }),
      "data-schematic-rect-id": schRect.schematic_rect_id,
      ...(schRect.schematic_component_id && {
        "data-schematic-component-id": schRect.schematic_component_id,
      }),
    },
    children: [],
    value: "",
  }

  return [svgRect]
}
