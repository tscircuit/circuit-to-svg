import type { PcbSilkscreenText } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import {
  type Matrix,
  applyToPoint,
  compose,
  rotate,
  translate,
  toString as matrixToString,
} from "transformation-matrix"

export function createSvgObjectsFromPcbSilkscreenText(
  pcbSilkscreenText: PcbSilkscreenText,
  transform: Matrix,
): SvgObject[] {
  const {
    anchor_position,
    text,
    font_size = 1,
    layer = "top",
    stroke_width = 0.001,
    ccw_rotation = 0,
  } = pcbSilkscreenText

  if (
    !anchor_position ||
    typeof anchor_position.x !== "number" ||
    typeof anchor_position.y !== "number"
  ) {
    console.error("Invalid anchor_position:", anchor_position)
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    anchor_position.x,
    anchor_position.y,
  ])
  const transformedFontSize = font_size * Math.abs(transform.a)
  const transformedStrokeWidth = stroke_width * Math.abs(transform.a)

  // Remove ${} from text value and handle undefined text

  // Create a composite transformation
  const textTransform = compose(
    translate(transformedX, transformedY),
    rotate((ccw_rotation * Math.PI) / 180), // Convert degrees to radians
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
      "stroke-width": transformedStrokeWidth.toString(),
      transform: matrixToString(textTransform),
      class: `pcb-silkscreen-text pcb-silkscreen-${layer}`,
      "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_component_id,
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
