import type { PcbNoteLine } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

const DEFAULT_OVERLAY_COLOR = "rgba(255,255,255,0.5)"

export function createSvgObjectsFromPcbNoteLine(
  noteLine: PcbNoteLine,
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx
  const { x1, y1, x2, y2, stroke_width, color, is_dashed } = noteLine

  if (
    typeof x1 !== "number" ||
    typeof y1 !== "number" ||
    typeof x2 !== "number" ||
    typeof y2 !== "number"
  ) {
    console.error("Invalid pcb_note_line coordinates", {
      x1,
      y1,
      x2,
      y2,
    })
    return []
  }

  const [startX, startY] = applyToPoint(transform, [x1, y1])
  const [endX, endY] = applyToPoint(transform, [x2, y2])
  const baseStrokeWidth = typeof stroke_width === "number" ? stroke_width : 0
  const transformedStrokeWidth = baseStrokeWidth * Math.abs(transform.a)

  const attributes: Record<string, string> = {
    x1: startX.toString(),
    y1: startY.toString(),
    x2: endX.toString(),
    y2: endY.toString(),
    stroke: color ?? DEFAULT_OVERLAY_COLOR,
    "stroke-width": transformedStrokeWidth.toString(),
    "stroke-linecap": "round",
    class: "pcb-note-line",
    "data-type": "pcb_note_line",
    "data-pcb-note-line-id": noteLine.pcb_note_line_id,
    "data-pcb-layer": "overlay",
  }

  if (is_dashed) {
    const dash = 0.2 * Math.abs(transform.a)
    const gap = 0.1 * Math.abs(transform.a)
    attributes["stroke-dasharray"] = `${dash} ${gap}`
  }

  const svgObject: SvgObject = {
    name: "line",
    type: "element",
    value: "",
    attributes,
    children: [],
  }

  return [svgObject]
}
