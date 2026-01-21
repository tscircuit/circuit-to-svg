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
import { distance } from "circuit-json"

let silkscreenMaskIdCounter = 0

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
    knockout_padding,
    is_mirrored = false,
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

  const [transformedX, transformedY] = applyToPoint(transform, [
    anchor_position.x,
    anchor_position.y,
  ])

  const scaleFactor = Math.abs(transform.a)
  const transformedFontSize = font_size * scaleFactor

  const color =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  const isBottom = layer === "bottom"
  const applyMirror = isBottom ? true : is_mirrored === true

  // Handle knockout silkscreen text
  if (is_knockout) {
    // Parse padding values
    const defaultPadding = font_size * 0.3
    const padLeft = knockout_padding?.left
      ? distance.parse(knockout_padding.left)
      : defaultPadding
    const padRight = knockout_padding?.right
      ? distance.parse(knockout_padding.right)
      : defaultPadding
    const padTop = knockout_padding?.top
      ? distance.parse(knockout_padding.top)
      : defaultPadding
    const padBottom = knockout_padding?.bottom
      ? distance.parse(knockout_padding.bottom)
      : defaultPadding

    // Calculate text dimensions (approximate)
    const lines = text.split("\n")
    const maxLineLength = Math.max(...lines.map((l) => l.length))
    const textWidth = maxLineLength * font_size * 0.6
    const lineHeight = font_size * 1.2
    const textHeight = lines.length * lineHeight

    // Calculate rect dimensions with padding
    const rectW = (textWidth + padLeft + padRight) * scaleFactor
    const rectH = (textHeight + padTop + padBottom) * scaleFactor

    const knockoutTransform = matrixToString(
      compose(
        translate(transformedX, transformedY),
        rotate((-ccw_rotation * Math.PI) / 180),
        ...(applyMirror ? [scale(-1, 1)] : []),
      ),
    )

    const maskId = `silkscreen-knockout-mask-${pcbSilkscreenText.pcb_silkscreen_text_id}-${silkscreenMaskIdCounter++}`

    // Build text children for mask
    const textChildren: SvgObject[] =
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
              dy: idx === 0 ? "0" : (lineHeight * scaleFactor).toString(),
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

    // Calculate text offset based on anchor alignment
    let textOffsetY = 0
    if (anchor_alignment.includes("top")) {
      textOffsetY = -rectH / 2 + (padTop * scaleFactor) + (transformedFontSize * 0.8)
    } else if (anchor_alignment.includes("bottom")) {
      textOffsetY = rectH / 2 - (padBottom * scaleFactor) - (textHeight * scaleFactor - transformedFontSize * 0.8)
    } else {
      // center
      textOffsetY = transformedFontSize * 0.3
    }

    return [
      {
        name: "defs",
        type: "element",
        value: "",
        children: [
          {
            name: "mask",
            type: "element",
            value: "",
            attributes: {
              id: maskId,
            },
            children: [
              {
                name: "rect",
                type: "element",
                value: "",
                attributes: {
                  x: (-rectW / 2).toString(),
                  y: (-rectH / 2).toString(),
                  width: rectW.toString(),
                  height: rectH.toString(),
                  fill: "white",
                },
                children: [],
              },
              {
                name: "text",
                type: "element",
                value: "",
                attributes: {
                  x: "0",
                  y: textOffsetY.toString(),
                  fill: "black",
                  "font-family": "Arial, sans-serif",
                  "font-size": transformedFontSize.toString(),
                  "text-anchor": "middle",
                  "dominant-baseline": "central",
                },
                children: textChildren,
              },
            ],
          },
        ],
        attributes: {},
      },
      {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          x: (-rectW / 2).toString(),
          y: (-rectH / 2).toString(),
          width: rectW.toString(),
          height: rectH.toString(),
          fill: color,
          mask: `url(#${maskId})`,
          transform: knockoutTransform,
          class: `pcb-silkscreen-text pcb-silkscreen-knockout pcb-silkscreen-${layer}`,
          "data-type": "pcb_silkscreen_text",
          "data-pcb-silkscreen-text-id":
            pcbSilkscreenText.pcb_silkscreen_text_id,
          "data-pcb-layer": layer,
        },
      },
    ]
  }

  // Regular (non-knockout) silkscreen text rendering
  // Set text-anchor and dominant-baseline based on alignment
  let textAnchor = "middle"
  let dominantBaseline = "central"
  const dx = 0
  const dy = 0

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

  const textTransform = compose(
    translate(transformedX, transformedY),
    rotate((-ccw_rotation * Math.PI) / 180), // Negate to make counter-clockwise
    ...(layer === "bottom" ? [scale(-1, 1)] : []),
  )

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

  const svgObject: SvgObject = {
    name: "text",
    type: "element",
    attributes: {
      x: "0",
      y: "0",
      dx: dx.toString(),
      dy: dy.toString(),
      fill: color,
      "font-family": "Arial, sans-serif",
      "font-size": transformedFontSize.toString(),
      "text-anchor": textAnchor,
      "dominant-baseline": dominantBaseline,
      transform: matrixToString(textTransform),
      class: `pcb-silkscreen-text pcb-silkscreen-${layer}`,
      "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_component_id,
      stroke: "none",
      "data-type": "pcb_silkscreen_text",
      "data-pcb-layer": layer,
    },
    children,
    value: "",
  }

  return [svgObject]
}
