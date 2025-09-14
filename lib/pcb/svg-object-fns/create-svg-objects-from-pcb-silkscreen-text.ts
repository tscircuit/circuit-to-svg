import type { PcbSilkscreenText } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import {
  applyToPoint,
  compose,
  rotate,
  translate,
  scale,
  toString as matrixToString,
} from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbSilkscreenText(
  pcbSilkscreenText: PcbSilkscreenText,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    anchor_position,
    text,
    font_size = 1,
    layer = "top",
    ccw_rotation = 0,
    anchor_alignment = "center",
    is_knockout = false,
    knockout_padding = {
      left: 0.2,
      right: 0.2,
      top: 0.2,
      bottom: 0.2,
    },
  } = pcbSilkscreenText

  if (layerFilter && layer !== layerFilter) return []

  if (
    !anchor_position ||
    typeof anchor_position.x !== "number" ||
    typeof anchor_position.y !== "number"
  ) {
    console.error("Invalid anchor_position:", anchor_position)
    return []
  }

  // Position & size after board transform
  const [tx, ty] = applyToPoint(transform, [anchor_position.x, anchor_position.y])
  const transformedFontSize = font_size * Math.abs(transform.a)

  // Alignment → SVG text attributes
  let textAnchor = "middle"
  let dominantBaseline = "central"

  switch (anchor_alignment) {
    case "top_left":
      textAnchor = "start"
      dominantBaseline = "text-before-edge"
      break
    case "top_center":
      textAnchor = "middle"
      dominantBaseline = "text-before-edge"
      break
    case "top_right":
      textAnchor = "end"
      dominantBaseline = "text-before-edge"
      break
    case "center_left":
      textAnchor = "start"
      dominantBaseline = "central"
      break
    case "center_right":
      textAnchor = "end"
      dominantBaseline = "central"
      break
    case "bottom_left":
      textAnchor = "start"
      dominantBaseline = "text-after-edge"
      break
    case "bottom_center":
      textAnchor = "middle"
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

  // Compose transform (mirror bottom layer horizontally)
  const textTransform = compose(
    translate(tx, ty),
    rotate((ccw_rotation * Math.PI) / 180),
    ...(layer === "bottom" ? [scale(-1, 1)] : []),
  )

  const silkscreenColor =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  // Handle multi-line
  const lines = text.split("\n")
  const children: SvgObject[] =
    lines.length === 1
      ? [
          {
            type: "text",
            value: text,
            name: "",
            attributes: {},
            children: [],
          },
        ]
      : lines.map((line, idx) => ({
          type: "element",
          name: "tspan",
          value: "",
          attributes: {
            x: "0",
            ...(idx > 0 ? { dy: transformedFontSize.toString() } : {}),
          },
          children: [
            {
              type: "text",
              value: line,
              name: "",
              attributes: {},
              children: [],
            },
          ],
        }))

  const textAttributes = {
    x: "0",
    y: "0",
    dx: "0",
    dy: "0",
    fill: silkscreenColor,
    "font-family": "Arial, sans-serif",
    "font-size": transformedFontSize.toString(),
    "text-anchor": textAnchor,
    "dominant-baseline": dominantBaseline,
    transform: matrixToString(textTransform),
    class: `pcb-silkscreen-text pcb-silkscreen-${layer}`,
    "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_component_id,
    stroke: "none",
  }

  const textObject: SvgObject = {
    name: "text",
    type: "element",
    attributes: textAttributes,
    children,
    value: "",
  }

  // Simple "text is painted" case
  if (!is_knockout) return [textObject]

  // Knockout case: build a mask (white keeps, black cuts text)
  const padL = knockout_padding.left * Math.abs(transform.a)
  const padR = knockout_padding.right * Math.abs(transform.a)
  const padT = knockout_padding.top * Math.abs(transform.a)
  const padB = knockout_padding.bottom * Math.abs(transform.a)

  // Approximate width/height (character-count based)
  const maxLineLen = Math.max(...lines.map((l) => l.length), 0)
  const textWidth = maxLineLen * transformedFontSize
  const textHeight = lines.length * transformedFontSize

  const rectWidth = textWidth + padL + padR
  const rectHeight = textHeight + padT + padB

  let rectX = -padL
  let rectY = -padT

  switch (anchor_alignment) {
    case "top_center":
      rectX = -textWidth / 2 - padL
      break
    case "top_right":
      rectX = -textWidth - padL
      break
    case "center_left":
      rectY = -textHeight / 2 - padT
      break
    case "center":
      rectX = -textWidth / 2 - padL
      rectY = -textHeight / 2 - padT
      break
    case "center_right":
      rectX = -textWidth - padL
      rectY = -textHeight / 2 - padT
      break
    case "bottom_left":
      rectY = -textHeight - padT
      break
    case "bottom_center":
      rectX = -textWidth / 2 - padL
      rectY = -textHeight - padT
      break
    case "bottom_right":
      rectX = -textWidth - padL
      rectY = -textHeight - padT
      break
  }

  const maskId = `pcb-silkscreen-text-mask-${pcbSilkscreenText.pcb_silkscreen_text_id}`

  // In a luminance mask: WHITE keeps, BLACK cuts.
  const maskRect: SvgObject = {
    name: "rect",
    type: "element",
    attributes: {
      x: rectX.toString(),
      y: rectY.toString(),
      width: rectWidth.toString(),
      height: rectHeight.toString(),
      fill: "white", // IMPORTANT: white keeps the painted area
      transform: matrixToString(textTransform),
    },
    children: [],
    value: "",
  }

  const maskText: SvgObject = {
    name: "text",
    type: "element",
    attributes: {
      ...textAttributes,
      fill: "black", // IMPORTANT: black punches a hole (transparent)
      "fill-opacity": "1",
    },
    children,
    value: "",
  }

  const maskObject: SvgObject = {
    name: "mask",
    type: "element",
    attributes: {
      id: maskId,
      maskUnits: "userSpaceOnUse",
      maskContentUnits: "userSpaceOnUse",
      // Bound the mask to the rect in local coords
      x: rectX.toString(),
      y: rectY.toString(),
      width: rectWidth.toString(),
      height: rectHeight.toString(),
      style: "mask-type:luminance",
    },
    children: [maskRect, maskText],
    value: "",
  }

  // Painted rectangle that gets punched by the mask
  const rectObject: SvgObject = {
    name: "rect",
    type: "element",
    attributes: {
      x: rectX.toString(),
      y: rectY.toString(),
      width: rectWidth.toString(),
      height: rectHeight.toString(),
      fill: silkscreenColor, // the paint color
      transform: matrixToString(textTransform),
      mask: `url(#${maskId})`,
      class: `pcb-silkscreen-text-knockout-area pcb-silkscreen-${layer}`,
      "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_component_id,
    },
    children: [],
    value: "",
  }

  // Ensure mask is defined before its first use
  return [maskObject, rectObject]
}
