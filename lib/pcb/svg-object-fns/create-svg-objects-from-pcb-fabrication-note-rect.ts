import type { PcbFabricationNoteRect } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

const DEFAULT_OVERLAY_STROKE_COLOR = "rgba(255,255,255,0.5)"
const DEFAULT_OVERLAY_FILL_COLOR = "rgba(255,255,255,0.2)"

export function createSvgObjectsFromPcbFabricationNoteRect(
  fabricationNoteRect: PcbFabricationNoteRect,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter } = ctx
  const {
    center,
    width,
    height,
    stroke_width,
    is_filled,
    has_stroke,
    is_stroke_dashed,
    color,
    layer = "top",
    pcb_component_id,
    pcb_fabrication_note_rect_id,
    corner_radius,
  } = fabricationNoteRect

  if (layerFilter && layer !== layerFilter) return []

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    console.error(
      `[pcb_fabrication_note_rect] Invalid data for "${pcb_fabrication_note_rect_id}": expected center {x: number, y: number}, width: number, height: number, got center=${JSON.stringify(center)}, width=${JSON.stringify(width)}, height=${JSON.stringify(height)}`,
    )
    return []
  }

  const halfWidth = width / 2
  const halfHeight = height / 2

  const [topLeftX, topLeftY] = applyToPoint(transform, [
    center.x - halfWidth,
    center.y + halfHeight,
  ])
  const [bottomRightX, bottomRightY] = applyToPoint(transform, [
    center.x + halfWidth,
    center.y - halfHeight,
  ])

  const rectX = Math.min(topLeftX, bottomRightX)
  const rectY = Math.min(topLeftY, bottomRightY)
  const rectWidth = Math.abs(bottomRightX - topLeftX)
  const rectHeight = Math.abs(bottomRightY - topLeftY)

  const baseStrokeWidth = typeof stroke_width === "number" ? stroke_width : 0
  const transformedStrokeWidth = baseStrokeWidth * Math.abs(transform.a)

  const overlayStrokeColor = color ?? DEFAULT_OVERLAY_STROKE_COLOR
  const baseCornerRadius =
    typeof corner_radius === "number" && corner_radius > 0 ? corner_radius : 0
  const transformedCornerRadiusX = baseCornerRadius * Math.abs(transform.a)
  const transformedCornerRadiusY = baseCornerRadius * Math.abs(transform.d)

  const attributes: Record<string, string> = {
    x: rectX.toString(),
    y: rectY.toString(),
    width: rectWidth.toString(),
    height: rectHeight.toString(),
    class: "pcb-fabrication-note-rect",
    "data-type": "pcb_fabrication_note_rect",
    "data-pcb-fabrication-note-rect-id": pcb_fabrication_note_rect_id,
    "data-pcb-layer": "overlay",
  }

  if (pcb_component_id !== undefined) {
    attributes["data-pcb-component-id"] = pcb_component_id
  }
  if (transformedCornerRadiusX > 0) {
    attributes.rx = transformedCornerRadiusX.toString()
  }

  if (transformedCornerRadiusY > 0) {
    attributes.ry = transformedCornerRadiusY.toString()
  }

  if (is_filled) {
    attributes.fill = color ?? DEFAULT_OVERLAY_FILL_COLOR
  } else {
    attributes.fill = "none"
  }

  const shouldDrawStroke = has_stroke ?? transformedStrokeWidth > 0

  if (shouldDrawStroke) {
    attributes.stroke = overlayStrokeColor
    attributes["stroke-width"] = transformedStrokeWidth.toString()

    if (is_stroke_dashed) {
      const dash = 0.2 * Math.abs(transform.a)
      const gap = 0.1 * Math.abs(transform.a)
      attributes["stroke-dasharray"] = `${dash} ${gap}`
    }
  } else {
    attributes.stroke = "none"
  }

  const svgObject: SvgObject = {
    name: "rect",
    type: "element",
    value: "",
    attributes,
    children: [],
  }

  return [svgObject]
}
