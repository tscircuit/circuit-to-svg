import type { NinePointAnchor, PcbFabricationNoteText } from "circuit-json"
import { debugPcb } from "lib/utils/debug"
import type { INode as SvgObject } from "svgson"
import { toString as matrixToString } from "transformation-matrix"
import { applyToPoint, compose, rotate, translate } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { getSvgTextAnchorAlignment } from "../get-svg-text-anchor-alignment"

export function createSvgObjectsFromPcbFabricationNoteText(
  pcbFabNoteText: PcbFabricationNoteText,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter } = ctx
  const {
    anchor_position,
    anchor_alignment = "center",
    text,
    font_size = 1,
    layer = "top",
    color,
    ccw_rotation = 0,
  } = pcbFabNoteText

  if (layerFilter && layer !== layerFilter) return []

  if (
    !anchor_position ||
    typeof anchor_position.x !== "number" ||
    typeof anchor_position.y !== "number"
  ) {
    debugPcb(
      `[pcb_fabrication_note_text] Invalid anchor_position for "${pcbFabNoteText.pcb_fabrication_note_text_id}": expected {x: number, y: number}, got ${JSON.stringify(anchor_position)}`,
    )
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    anchor_position.x,
    anchor_position.y,
  ])
  const transformedFontSize = font_size * Math.abs(transform.a)

  const { textAnchor, dominantBaseline } = getSvgTextAnchorAlignment(
    anchor_alignment as NinePointAnchor,
  )

  // Create a composite transformation
  const textTransform = compose(
    translate(transformedX, transformedY),
    rotate((-ccw_rotation * Math.PI) / 180),
  )

  const svgObject: SvgObject = {
    name: "text",
    type: "element",
    attributes: {
      x: "0",
      y: "0",
      "font-family": "Arial, sans-serif",
      "font-size": transformedFontSize.toString(),
      "text-anchor": textAnchor,
      "dominant-baseline": dominantBaseline,
      transform: matrixToString(textTransform),
      class: "pcb-fabrication-note-text",
      fill: color || "rgba(255,255,255,0.5)",
      "data-type": "pcb_fabrication_note_text",
      "data-pcb-layer": "overlay",
    },
    children: [
      {
        type: "text",
        value: text,
        name: "",
        attributes: {},
        children: [],
      },
    ],
    value: "",
  }

  return [svgObject]
}
