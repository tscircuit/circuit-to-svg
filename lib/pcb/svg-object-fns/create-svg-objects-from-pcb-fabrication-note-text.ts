import type { PcbFabricationNoteText } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { toString as matrixToString } from "transformation-matrix"
import { applyToPoint, compose, rotate, translate } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbFabricationNoteText(
  pcbFabNoteText: PcbFabricationNoteText,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter } = ctx
  const {
    anchor_position,
    anchor_alignment,
    text,
    font_size = 1,
    layer = "top",
    color,
  } = pcbFabNoteText

  if (layerFilter && layer !== layerFilter) return []

  if (
    !anchor_position ||
    typeof anchor_position.x !== "number" ||
    typeof anchor_position.y !== "number"
  ) {
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    anchor_position.x,
    anchor_position.y,
  ])
  const transformedFontSize = font_size * Math.abs(transform.a)

  // Remove ${} from text value and handle undefined text

  // Create a composite transformation
  const textTransform = compose(
    translate(transformedX, transformedY), // TODO do anchor_alignment
    rotate(Math.PI / 180), // Convert degrees to radians
  )

  const svgObject: SvgObject = {
    name: "text",
    type: "element",
    attributes: {
      x: "0",
      y: "0",
      "font-family": "Arial, sans-serif",
      "font-size": transformedFontSize.toString(),
      "text-anchor": "middle",
      "dominant-baseline": "central",
      transform: matrixToString(textTransform),
      class: "pcb-fabrication-note-text",
      fill: color || "rgba(255,255,255,0.5)",
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
