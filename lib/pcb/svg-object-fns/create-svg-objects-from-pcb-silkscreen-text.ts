import type { PcbSilkscreenText } from "circuit-json"
import { debugPcb } from "lib/utils/debug"
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
import { lineAlphabet } from "@tscircuit/alphabet"

type AlphabetKey = keyof typeof lineAlphabet

// Derive character cell dimensions from lineAlphabet glyph bounding boxes
const alphabetBounds = (() => {
  let maxX = 0
  let minY = Infinity
  let maxY = -Infinity
  for (const segments of Object.values(lineAlphabet)) {
    for (const seg of segments as Array<{
      x1: number
      y1: number
      x2: number
      y2: number
    }>) {
      maxX = Math.max(maxX, seg.x1, seg.x2)
      minY = Math.min(minY, seg.y1, seg.y2)
      maxY = Math.max(maxY, seg.y1, seg.y2)
    }
  }
  return { width: maxX, height: maxY - minY }
})()

/** Inter-character spacing as a fraction of cell width (20% gap between chars) */
const INTER_CHAR_SPACING_RATIO = 0.2
/** Line-height multiplier for multi-line text (10% extra vertical space) */
const LINE_HEIGHT_MULTIPLIER = 1.1

let silkscreenMaskIdCounter = 0

function linesToPathData(
  lines: Array<{ x1: number; y1: number; x2: number; y2: number }>,
  offsetX: number,
  offsetY: number,
  charScale: number,
): string {
  return lines
    .map((line) => {
      const x1 = offsetX + line.x1 * charScale
      const y1 = offsetY + (1 - line.y1) * charScale
      const x2 = offsetX + line.x2 * charScale
      const y2 = offsetY + (1 - line.y2) * charScale
      return `M${x1} ${y1}L${x2} ${y2}`
    })
    .join(" ")
}

function textToCenteredAlphabetPaths(
  text: string,
  fontSize: number,
): { pathData: string; width: number; height: number } {
  const textLines = text.split("\n")
  const charSpacing = alphabetBounds.width * INTER_CHAR_SPACING_RATIO
  const lineHeight = fontSize * alphabetBounds.height * LINE_HEIGHT_MULTIPLIER
  const totalHeight = textLines.length * lineHeight
  const charAdvance = (alphabetBounds.width + charSpacing) * fontSize

  const lineWidths: number[] = []
  let maxWidth = 0

  for (const line of textLines) {
    let width = 0
    for (const char of line) {
      if (char === " ") {
        width += charAdvance * 0.6
      } else {
        width += charAdvance
      }
    }
    width = width > 0 ? width - charSpacing * fontSize : 0
    lineWidths.push(width)
    if (width > maxWidth) maxWidth = width
  }

  const paths: string[] = []
  let y = -totalHeight / 2

  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i]!
    const lineWidth = lineWidths[i]!
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
    debugPcb(
      `[pcb_silkscreen_text] Invalid anchor_position for "${pcbSilkscreenText.pcb_silkscreen_text_id}": expected {x: number, y: number}, got ${JSON.stringify(anchor_position)}`,
    )
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    anchor_position.x,
    anchor_position.y,
  ])

  const scaleFactor = Math.abs(transform.a)
  const silkscreenColor =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  const isBottom = layer === "bottom"
  const applyMirror = isBottom ? true : is_mirrored === true

  // Handle knockout rendering
  if (is_knockout) {
    const scaledFontSize = (font_size * (2 / 3)) / alphabetBounds.height
    const { pathData, width, height } = textToCenteredAlphabetPaths(
      text,
      scaledFontSize,
    )

    const padLeft = knockout_padding?.left ?? scaledFontSize * 0.5
    const padRight = knockout_padding?.right ?? scaledFontSize * 0.5
    const padTop = knockout_padding?.top ?? scaledFontSize * 0.3
    const padBottom = knockout_padding?.bottom ?? scaledFontSize * 0.3

    const rectX = -width / 2 - padLeft
    const rectY = -height / 2 - padTop
    const rectW = width + padLeft + padRight
    const rectH = height + padTop + padBottom
    const strokeWidth = scaledFontSize * 0.15

    const knockoutTransform = matrixToString(
      compose(
        translate(transformedX, transformedY),
        rotate((-ccw_rotation * Math.PI) / 180),
        ...(applyMirror ? [scale(-1, 1)] : []),
        scale(scaleFactor, scaleFactor),
      ),
    )

    const maskId = `silkscreen-knockout-mask-${pcbSilkscreenText.pcb_silkscreen_text_id}-${silkscreenMaskIdCounter++}`

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
                  x: rectX.toString(),
                  y: rectY.toString(),
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
          x: rectX.toString(),
          y: rectY.toString(),
          width: rectW.toString(),
          height: rectH.toString(),
          fill: silkscreenColor,
          mask: `url(#${maskId})`,
          transform: knockoutTransform,
          class: `pcb-silkscreen-text-knockout pcb-silkscreen-${layer}`,
          "data-type": "pcb_silkscreen_text",
          "data-pcb-silkscreen-text-id":
            pcbSilkscreenText.pcb_silkscreen_text_id,
          "data-pcb-layer": layer,
        },
      },
    ]
  }

  // Regular (non-knockout) rendering
  const transformedFontSize = font_size * scaleFactor

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
    rotate((-ccw_rotation * Math.PI) / 180),
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
      fill: silkscreenColor,
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
