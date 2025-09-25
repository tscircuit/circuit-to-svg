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

let knockoutIdCounter = 0
function getUniqueKnockoutId(): string {
  return `knockout-mask-${++knockoutIdCounter}`
}
function lengthToPixels(
  length: string | number | undefined,
  defaultValue: number,
  scale: number,
): number {
  if (length === undefined) return defaultValue
  if (typeof length === "number") return length * scale

  const match = length.match(/^([\d.]+)(\w+)$/)
  if (!match) return defaultValue

  const value = parseFloat(match[1])
  const unit = match[2]

  switch (unit) {
    case "mm":
      return value * scale
    case "px":
      return value
    default:
      return defaultValue
  }
}

const makeTextChildren = (lines: string[], fs: number): SvgObject[] =>
  lines.length === 1
    ? [
        {
          type: "text",
          value: lines[0] ?? "",
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
          ...(idx > 0 ? { dy: fs.toString() } : {}),
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

const measureText = (lines: string[], fs: number) => {
  const maxLen = Math.max(...lines.map((s) => s.length), 1)
  const width = maxLen * 0.6 * fs
  const height = fs * (lines.length <= 1 ? 1.2 : lines.length - 1 + 1.2)
  return { width, height }
}

export function createSvgObjectsFromPcbSilkscreenTextKnockout(
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
    knockout_corner_radius,
    knockout_border_width,
    knockout_color,
  } = pcbSilkscreenText as any

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

  const parsedFontSize =
    typeof font_size === "string"
      ? lengthToPixels(font_size, 1, 1)
      : font_size || 1
  const transformedFontSize = parsedFontSize * Math.abs(transform.a)
  const lines = (text ?? "").toString().split("\n")

  let textAnchor: string = "middle"
  let dominantBaseline: string = "central"

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
    rotate((-ccw_rotation * Math.PI) / 180),
    ...(layer === "bottom" ? [scale(-1, 1)] : []),
  )

  const color =
    knockout_color ??
    (layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top)

  if (!is_knockout) {
    const svgObject: SvgObject = {
      name: "text",
      type: "element",
      attributes: {
        x: "0",
        y: "0",
        fill: color,
        "font-family": "Arial, sans-serif",
        "font-size": transformedFontSize.toString(),
        "text-anchor": textAnchor,
        "dominant-baseline": dominantBaseline,
        transform: matrixToString(textTransform),
        class: `pcb-silkscreen-text pcb-silkscreen-${layer}`,
        "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_silkscreen_text_id,
        stroke: "none",
      },
      children: makeTextChildren(lines, transformedFontSize),
      value: "",
    }
    return [svgObject]
  }

  const { width, height } = measureText(lines, transformedFontSize)

  const defaultPadding = 0.25 * Math.abs(transform.a)
  let padLeft = defaultPadding
  let padRight = defaultPadding
  let padTop = defaultPadding
  let padBottom = defaultPadding

  if (knockout_padding) {
    padLeft = lengthToPixels(
      knockout_padding.left,
      defaultPadding,
      Math.abs(transform.a),
    )
    padRight = lengthToPixels(
      knockout_padding.right,
      defaultPadding,
      Math.abs(transform.a),
    )
    padTop = lengthToPixels(
      knockout_padding.top,
      defaultPadding,
      Math.abs(transform.a),
    )
    padBottom = lengthToPixels(
      knockout_padding.bottom,
      defaultPadding,
      Math.abs(transform.a),
    )
  }

  let rx = 0
  if (textAnchor === "start") rx = 0
  else if (textAnchor === "middle") rx = -width / 2
  else if (textAnchor === "end") rx = -width

  let ry = 0
  if (dominantBaseline === "text-before-edge") ry = 0
  else if (dominantBaseline === "central") ry = -height / 2
  else if (dominantBaseline === "text-after-edge") ry = -height

  const rectX = (rx - padLeft).toString()
  const rectY = (ry - padTop).toString()
  const rectW = (width + padLeft + padRight).toString()
  const rectH = (height + padTop + padBottom).toString()

  const cornerRadius = lengthToPixels(
    knockout_corner_radius,
    0,
    Math.abs(transform.a),
  )
  const borderWidth = lengthToPixels(
    knockout_border_width,
    0,
    Math.abs(transform.a),
  )

  const maskId = getUniqueKnockoutId()

  const group: SvgObject = {
    type: "element",
    name: "g",
    value: "",
    attributes: {
      class: `pcb-silkscreen-knockout pcb-silkscreen-${layer}`,
      "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_silkscreen_text_id,
    },
    children: [
      {
        type: "element",
        name: "defs",
        value: "",
        attributes: {},
        children: [
          {
            type: "element",
            name: "mask",
            value: "",
            attributes: { id: maskId },
            children: [
              {
                type: "element",
                name: "rect",
                value: "",
                attributes: {
                  x: rectX,
                  y: rectY,
                  width: rectW,
                  height: rectH,
                  rx: cornerRadius.toString(),
                  ry: cornerRadius.toString(),
                  fill: "white",
                  transform: matrixToString(textTransform),
                },
                children: [],
              },
              {
                type: "element",
                name: "text",
                value: "",
                attributes: {
                  x: "0",
                  y: "0",
                  fill: "black",
                  "font-family": "Arial, sans-serif",
                  "font-size": transformedFontSize.toString(),
                  "text-anchor": textAnchor,
                  "dominant-baseline": dominantBaseline,
                  transform: matrixToString(textTransform),
                },
                children: makeTextChildren(lines, transformedFontSize),
              },
            ],
          },
        ],
      },
      ...(borderWidth > 0
        ? [
            {
              type: "element" as const,
              name: "rect",
              value: "",
              attributes: {
                x: rectX,
                y: rectY,
                width: rectW,
                height: rectH,
                rx: cornerRadius.toString(),
                ry: cornerRadius.toString(),
                fill: "none",
                stroke: color,
                "stroke-width": borderWidth.toString(),
                transform: matrixToString(textTransform),
              },
              children: [],
            },
          ]
        : []),
      {
        type: "element",
        name: "rect",
        value: "",
        attributes: {
          x: rectX,
          y: rectY,
          width: rectW,
          height: rectH,
          rx: cornerRadius.toString(),
          ry: cornerRadius.toString(),
          fill: color,
          transform: matrixToString(textTransform),
          mask: `url(#${maskId})`,
        },
        children: [],
      },
    ],
  }

  return [group]
}
