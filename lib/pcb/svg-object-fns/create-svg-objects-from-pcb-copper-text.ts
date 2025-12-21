import type { PcbCopperText } from "circuit-json"
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
import { layerNameToColor } from "../layer-name-to-color"
import { distance } from "circuit-json"
import { lineAlphabet } from "@tscircuit/alphabet"

const CHAR_WIDTH = 1.0
const CHAR_SPACING = 0.2
const LINE_HEIGHT = 1.4
const FONT_SCALE = 0.53
const BASELINE_Y = 0.241

type AlphabetKey = keyof typeof lineAlphabet

function linesToPathData(
  lines: Array<{ x1: number; y1: number; x2: number; y2: number }>,
  offsetX: number,
  offsetY: number,
  charScale: number,
  baselineAdjust: number = 0,
): string {
  return lines
    .map((line) => {
      const x1 = offsetX + line.x1 * charScale
      const y1 = offsetY + (1 - line.y1 + baselineAdjust) * charScale
      const x2 = offsetX + line.x2 * charScale
      const y2 = offsetY + (1 - line.y2 + baselineAdjust) * charScale
      return `M${x1} ${y1}L${x2} ${y2}`
    })
    .join(" ")
}

function textToAlphabetPath(
  text: string,
  fontSize: number,
): { pathData: string; width: number } {
  const paths: string[] = []
  const charAdvance = (CHAR_WIDTH + CHAR_SPACING) * fontSize
  let x = 0

  for (const char of text) {
    if (char === " ") {
      x += charAdvance * 0.6
      continue
    }

    const lines = lineAlphabet[char as AlphabetKey]
    if (lines) {
      paths.push(linesToPathData(lines, x, 0, fontSize))
    }
    x += charAdvance
  }

  const width = x > 0 ? x - CHAR_SPACING * fontSize : 0
  return { pathData: paths.join(" "), width }
}

let maskIdCounter = 0

function textToCenteredAlphabetPaths(
  text: string,
  fontSize: number,
): { pathData: string; width: number; height: number } {
  const textLines = text.split("\n")
  const lineHeight = fontSize * LINE_HEIGHT
  const totalHeight = textLines.length * lineHeight

  const lineWidths: number[] = []
  let maxWidth = 0

  for (const line of textLines) {
    const { width } = textToAlphabetPath(line, fontSize)
    lineWidths.push(width)
    if (width > maxWidth) maxWidth = width
  }

  const paths: string[] = []
  let y = -totalHeight / 2

  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i]!
    const lineWidth = lineWidths[i]!
    const charAdvance = (CHAR_WIDTH + CHAR_SPACING) * fontSize
    let x = -lineWidth / 2

    for (const char of line) {
      if (char === " ") {
        x += charAdvance * 0.6
        continue
      }

      const charLines = lineAlphabet[char as AlphabetKey]
      if (charLines) {
        paths.push(linesToPathData(charLines, x, y, fontSize))
      }
      x += charAdvance
    }

    y += lineHeight
  }

  return {
    pathData: paths.join(" "),
    width: maxWidth,
    height: totalHeight,
  }
}

export function createSvgObjectsFromPcbCopperText(
  pcbCopperText: PcbCopperText,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: filterLayer, colorMap } = ctx
  const {
    anchor_position,
    text,
    font_size = "0.2mm",
    layer,
    ccw_rotation = 0,
    anchor_alignment = "center",
    is_knockout = false,
    knockout_padding,
    is_mirrored = false,
  } = pcbCopperText

  const layerName = layer ?? "top"

  if (filterLayer && filterLayer !== layerName) return []
  if (!anchor_position) return []

  const [ax, ay] = applyToPoint(transform, [
    anchor_position.x,
    anchor_position.y,
  ])

  const fontSizeNum = distance.parse(font_size) ?? 0.2
  const scaleFactor = Math.abs(transform.a)
  const copperColor = layerNameToColor(layerName, colorMap)

  const isBottom = layerName === "bottom"
  const applyMirror = isBottom ? true : is_mirrored === true

  if (is_knockout) {
    const scaledFontSize = fontSizeNum * FONT_SCALE
    const { pathData, width, height } = textToCenteredAlphabetPaths(
      text,
      scaledFontSize,
    )

    const padX = knockout_padding?.left ?? scaledFontSize * 0.5
    const padY = knockout_padding?.top ?? scaledFontSize * 0.3

    const rectW = width + padX * 2
    const rectH = height + padY * 2
    const strokeWidth = scaledFontSize * 0.15

    const knockoutTransform = matrixToString(
      compose(
        translate(ax, ay),
        rotate((-ccw_rotation * Math.PI) / 180),
        ...(applyMirror ? [scale(-1, 1)] : []),
        scale(scaleFactor, scaleFactor),
      ),
    )

    const maskId = `knockout-mask-${pcbCopperText.pcb_copper_text_id}-${maskIdCounter++}`
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
                name: "path",
                type: "element",
                value: "",
                attributes: {
                  d: pathData,
                  fill: "none",
                  stroke: "black",
                  "stroke-width": strokeWidth.toString(),
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round",
                },
                children: [],
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
          fill: copperColor,
          mask: `url(#${maskId})`,
          transform: knockoutTransform,
          class: `pcb-copper-text-knockout pcb-copper-${layerName}`,
          "data-type": "pcb_copper_text",
          "data-pcb-copper-text-id": pcbCopperText.pcb_copper_text_id,
        },
      },
    ]
  }

  const scaledFontSize = fontSizeNum * FONT_SCALE
  const { pathData, width, height } = textToCenteredAlphabetPaths(
    text,
    scaledFontSize,
  )

  let offsetX = 0
  let offsetY = 0

  switch (anchor_alignment) {
    case "top_left":
      offsetX = width / 2
      offsetY = height / 2
      break
    case "top_center":
      offsetY = height / 2
      break
    case "top_right":
      offsetX = -width / 2
      offsetY = height / 2
      break
    case "center_left":
      offsetX = width / 2
      break
    case "center_right":
      offsetX = -width / 2
      break
    case "bottom_left":
      offsetX = width / 2
      offsetY = -height / 2
      break
    case "bottom_center":
      offsetY = -height / 2
      break
    case "bottom_right":
      offsetX = -width / 2
      offsetY = -height / 2
      break
  }

  const textTransform = matrixToString(
    compose(
      translate(ax, ay),
      rotate((-ccw_rotation * Math.PI) / 180),
      ...(applyMirror ? [scale(-1, 1)] : []),
      translate(offsetX, offsetY),
      scale(scaleFactor, scaleFactor),
    ),
  )

  const strokeWidth = scaledFontSize * 0.15

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        d: pathData,
        fill: "none",
        stroke: copperColor,
        "stroke-width": strokeWidth.toString(),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        transform: textTransform,
        class: `pcb-copper-text pcb-copper-${layerName}`,
        "data-type": "pcb_copper_text",
        "data-pcb-copper-text-id": pcbCopperText.pcb_copper_text_id,
      },
      children: [],
      value: "",
    },
  ]
}
