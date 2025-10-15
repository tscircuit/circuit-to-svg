import type { PcbNoteText } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { colorMap } from "lib/utils/colors"

const DEFAULT_OVERLAY_COLOR = colorMap.board.user_2

export function createSvgObjectsFromPcbNoteText(
  note: PcbNoteText,
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx
  const {
    anchor_position,
    text,
    font_size = 1,
    anchor_alignment = "center",
    color,
  } = note

  if (
    !anchor_position ||
    typeof anchor_position.x !== "number" ||
    typeof anchor_position.y !== "number"
  ) {
    console.error("Invalid pcb_note_text anchor_position", anchor_position)
    return []
  }

  if (typeof text !== "string" || text.length === 0) {
    console.error("Invalid pcb_note_text text", text)
    return []
  }

  const [x, y] = applyToPoint(transform, [anchor_position.x, anchor_position.y])
  const transformedFontSize = font_size * Math.abs(transform.a)

  let textAnchor: "start" | "middle" | "end" = "middle"
  let dominantBaseline: "central" | "text-before-edge" | "text-after-edge" =
    "central"

  switch (anchor_alignment) {
    case "top_left":
      textAnchor = "start"
      dominantBaseline = "text-before-edge"
      break
    case "top_right":
      textAnchor = "end"
      dominantBaseline = "text-before-edge"
      break
    case "bottom_left":
      textAnchor = "start"
      dominantBaseline = "text-after-edge"
      break
    case "bottom_right":
      textAnchor = "end"
      dominantBaseline = "text-after-edge"
      break
    case "center":
    default:
      textAnchor = "middle"
      dominantBaseline = "central"
      break
  }

  const svgObject: SvgObject = {
    name: "text",
    type: "element",
    value: "",
    attributes: {
      x: x.toString(),
      y: y.toString(),
      fill: color ?? DEFAULT_OVERLAY_COLOR,
      "font-family": "Arial, sans-serif",
      "font-size": transformedFontSize.toString(),
      "text-anchor": textAnchor,
      "dominant-baseline": dominantBaseline,
      class: "pcb-note-text",
      "data-type": "pcb_note_text",
      "data-pcb-note-text-id": note.pcb_note_text_id,
      "data-pcb-layer": "overlay",
    },
    children: [
      {
        type: "text",
        name: "",
        value: text,
        attributes: {},
        children: [],
      },
    ],
  }

  return [svgObject]
}
