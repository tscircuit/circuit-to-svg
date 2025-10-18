import type { PcbCourtyardRect } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCourtyardRect(
  pcbCourtyardRect: PcbCourtyardRect,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    center,
    width,
    height,
    layer = "top",
    pcb_courtyard_rect_id,
    stroke_width,
    is_filled,
    has_stroke,
    is_stroke_dashed,
  } = pcbCourtyardRect

  if (layerFilter && layer !== layerFilter) return []

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    console.error("Invalid courtyard rectangle data:", {
      center,
      width,
      height,
    })
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])

  const transformedWidth = width * Math.abs(transform.a)
  const transformedHeight = height * Math.abs(transform.d)

  const transformedStrokeWidth = (stroke_width ?? 0.05) * Math.abs(transform.a)

  const color = colorMap.drill

  const attributes: { [key: string]: string } = {
    x: (transformedX - transformedWidth / 2).toString(),
    y: (transformedY - transformedHeight / 2).toString(),
    width: transformedWidth.toString(),
    height: transformedHeight.toString(),
    class: `pcb-courtyard-rect pcb-courtyard-${layer}`,
    "data-pcb-courtyard-rect-id": pcb_courtyard_rect_id,
    "data-type": "pcb_courtyard_rect",
    "data-pcb-layer": layer,
  }

  attributes.fill = is_filled ? color : "none"

  let actualHasStroke: boolean
  if (has_stroke === undefined) {
    actualHasStroke = transformedStrokeWidth > 0
  } else {
    actualHasStroke = has_stroke
  }

  if (actualHasStroke) {
    attributes.stroke = color
    attributes["stroke-width"] = transformedStrokeWidth.toString()
    if (is_stroke_dashed) {
      const dashLength = 0.2 * Math.abs(transform.a)
      const gapLength = 0.1 * Math.abs(transform.a)
      attributes["stroke-dasharray"] = `${dashLength} ${gapLength}`
    }
  } else {
    attributes.stroke = "none"
  }

  const svgObject: SvgObject = {
    name: "rect",
    type: "element",
    attributes,
    value: "",
    children: [],
  }

  return [svgObject]
}
