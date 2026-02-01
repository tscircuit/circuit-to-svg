import type { PcbNoteRect } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { colorMap } from "lib/utils/colors"

const DEFAULT_OVERLAY_COLOR = colorMap.board.user_2
const DEFAULT_FILL_COLOR = colorMap.board.user_2

export function createSvgObjectsFromPcbNoteRect(
  noteRect: PcbNoteRect,
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx
  const {
    center,
    width,
    height,
    stroke_width,
    is_filled,
    has_stroke,
    is_stroke_dashed,
    color,
    corner_radius,
  } = noteRect

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    console.error(
      `[pcb_note_rect] Invalid data for "${noteRect.pcb_note_rect_id}": expected center {x: number, y: number}, width: number, height: number, got center=${JSON.stringify(center)}, width=${JSON.stringify(width)}, height=${JSON.stringify(height)}`,
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
  const baseCornerRadius =
    typeof corner_radius === "number" && corner_radius > 0 ? corner_radius : 0
  const transformedCornerRadiusX = baseCornerRadius * Math.abs(transform.a)
  const transformedCornerRadiusY = baseCornerRadius * Math.abs(transform.d)

  const overlayColor = color ?? DEFAULT_OVERLAY_COLOR
  const attributes: Record<string, string> = {
    x: rectX.toString(),
    y: rectY.toString(),
    width: rectWidth.toString(),
    height: rectHeight.toString(),
    class: "pcb-note-rect",
    "data-type": "pcb_note_rect",
    "data-pcb-note-rect-id": noteRect.pcb_note_rect_id,
    "data-pcb-layer": "overlay",
  }
  if (transformedCornerRadiusX > 0) {
    attributes.rx = transformedCornerRadiusX.toString()
  }

  if (transformedCornerRadiusY > 0) {
    attributes.ry = transformedCornerRadiusY.toString()
  }
  if (is_filled) {
    attributes.fill = color ?? DEFAULT_FILL_COLOR
  } else {
    attributes.fill = "none"
  }

  const shouldDrawStroke = has_stroke ?? transformedStrokeWidth > 0

  if (shouldDrawStroke) {
    attributes.stroke = overlayColor
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
