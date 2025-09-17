import type { SchematicArc } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { ColorMap } from "lib/utils/colors"

export function createSvgObjectsFromSchematicArc({
  schArc,
  transform,
  colorMap,
}: {
  schArc: SchematicArc
  transform: Matrix
  colorMap: ColorMap
}): SvgObject[] {
  const center = applyToPoint(transform, schArc.center)
  const transformedRadius = Math.abs(transform.a) * schArc.radius

  const strokeWidth = schArc.stroke_width ?? 0.02
  const transformedStrokeWidth = Math.abs(transform.a) * strokeWidth

  // Convert angles to radians
  const startAngleRad = (schArc.start_angle_degrees * Math.PI) / 180
  const endAngleRad = (schArc.end_angle_degrees * Math.PI) / 180

  // Calculate start and end points
  const startX = center.x + transformedRadius * Math.cos(startAngleRad)
  const startY = center.y + transformedRadius * Math.sin(startAngleRad)
  const endX = center.x + transformedRadius * Math.cos(endAngleRad)
  const endY = center.y + transformedRadius * Math.sin(endAngleRad)

  // Calculate if arc is large (> 180 degrees)
  let angleDiff = schArc.end_angle_degrees - schArc.start_angle_degrees
  if (schArc.direction === "clockwise") {
    angleDiff = -angleDiff
  }
  if (angleDiff < 0) {
    angleDiff += 360
  }
  const largeArcFlag = angleDiff > 180 ? 1 : 0

  // Sweep flag: 1 for clockwise, 0 for counterclockwise
  const sweepFlag = schArc.direction === "clockwise" ? 1 : 0

  // Create SVG path for the arc
  const pathData = `M ${startX} ${startY} A ${transformedRadius} ${transformedRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        d: pathData,
        fill: "none",
        stroke: schArc.color,
        "stroke-width": transformedStrokeWidth.toString(),
        ...(schArc.is_dashed && {
          "stroke-dasharray": (transformedStrokeWidth * 3).toString(),
        }),
        "data-schematic-arc-id": schArc.schematic_arc_id,
        ...(schArc.schematic_component_id && {
          "data-schematic-component-id": schArc.schematic_component_id,
        }),
      },
      children: [],
      value: "",
    },
  ]
}
