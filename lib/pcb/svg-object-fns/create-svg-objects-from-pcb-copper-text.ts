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

// Character spacing constants
const CHAR_WIDTH = 1.0
const CHAR_SPACING = 0.2
const LINE_HEIGHT = 1.4
const FONT_SCALE = 0.53
// Baseline position in alphabet coordinates (y=0 at bottom, y=1 at top)
// This matches how SVG text aligns lowercase letters on the baseline
// Determined by examining the alphabet: lowercase 'a' bottom is at y=0.241
const BASELINE_Y = 0.241

type AlphabetKey = keyof typeof lineAlphabet

/**
 * Convert line segments to SVG path data.
 * lineAlphabet uses mathematical coordinates (y=0 at bottom, y=1 at top)
 * SVG uses screen coordinates (y=0 at top), so we invert y with (1 - y)
 * @param baselineAdjust - Adjustment to align baseline (0.241 for uppercase to align with lowercase baseline)
 */
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
      // Adjust y to align baseline: uppercase (bottom at y=0) needs to shift up to baseline (y=0.241)
      // In alphabet coords: shift up by baselineAdjust (positive means move up in alphabet, which is down in SVG after inversion)
      // After inversion: shift becomes (1 - (y + baselineAdjust)) = (1 - y - baselineAdjust) = (1 - y) - baselineAdjust
      const y1 = offsetY + (1 - line.y1 - baselineAdjust) * charScale
      const x2 = offsetX + line.x2 * charScale
      const y2 = offsetY + (1 - line.y2 - baselineAdjust) * charScale
      return `M${x1} ${y1}L${x2} ${y2}`
    })
    .join(" ")
}

/**
 * Convert a single line of text to an SVG path.
 */
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
      // Uppercase letters and numbers have bottom at y=0, lowercase at y=0.241 (baseline)
      // To align baselines, shift uppercase/numbers up by 0.241 in alphabet coords
      const isUppercase = char >= "A" && char <= "Z"
      const isNumber = char >= "0" && char <= "9"
      const baselineAdjust = isUppercase || isNumber ? BASELINE_Y : 0
      paths.push(linesToPathData(lines, x, 0, fontSize, baselineAdjust))
    }
    x += charAdvance
  }

  const width = x > 0 ? x - CHAR_SPACING * fontSize : 0
  return { pathData: paths.join(" "), width }
}

// Counter for generating unique mask IDs
let maskIdCounter = 0

/**
 * MULTI-LINE TEXT:
 * Correct ordering: first line at top, next lines go downward.
 */
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
  // Baseline alignment: Characters should align on their baseline for proper mixed-case rendering
  // In alphabet coords, baseline is at BASELINE_Y (from bottom, where 0=bottom, 1=top)
  // After inversion in linesToPathData: baseline is at (1 - BASELINE_Y) * fontSize from offsetY
  // So if character is at offsetY, baseline is at: offsetY + (1 - BASELINE_Y) * fontSize
  // To align baselines: all characters in a line should have same baseline y-position
  const baselineOffsetFromCharTop = (1 - BASELINE_Y) * fontSize
  // Center the text block (for anchor alignment), but align baselines within it
  let y = -totalHeight / 2

  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i]!
    const lineWidth = lineWidths[i]!
    const charAdvance = (CHAR_WIDTH + CHAR_SPACING) * fontSize
    let x = -lineWidth / 2
    // Position characters so their baseline aligns
    // The baseline for this line should be at: y + baselineOffsetFromCharTop
    // Character offsetY so baseline is at that position: offsetY + baselineOffsetFromCharTop = y + baselineOffsetFromCharTop
    // Therefore: offsetY = y
    const charOffsetY = y

    for (const char of line) {
      if (char === " ") {
        x += charAdvance * 0.6
        continue
      }

      const charLines = lineAlphabet[char as AlphabetKey]
      if (charLines) {
        // Uppercase letters and numbers have bottom at y=0, lowercase at y=0.241 (baseline)
        // To align baselines, shift uppercase/numbers up by 0.241 in alphabet coords
        const isUppercase = char >= "A" && char <= "Z"
        const isNumber = char >= "0" && char <= "9"
        const baselineAdjust = isUppercase || isNumber ? BASELINE_Y : 0
        paths.push(
          linesToPathData(charLines, x, charOffsetY, fontSize, baselineAdjust),
        )
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

/**
 * MAIN: Convert PCB copper text into SVG objects.
 */
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
  // Auto-mirror bottom layer, or explicit mirror
  const applyMirror = isBottom ? true : is_mirrored === true

  //--------------------------------------
  // KNOCKOUT MODE
  //--------------------------------------
  if (is_knockout) {
    // Scale font size to match SVG text rendering
    const scaledFontSize = fontSizeNum * FONT_SCALE
    const { pathData, width, height } = textToCenteredAlphabetPaths(
      text,
      scaledFontSize,
    )

    const padX = knockout_padding?.left ?? scaledFontSize * 0.5
    const padY = knockout_padding?.top ?? scaledFontSize * 0.3

    const rectW = width + padX * 2
    const rectH = height + padY * 2

    // Stroke width for text cutout - matches normal text rendering
    const strokeWidth = scaledFontSize * 0.15

    const knockoutTransform = matrixToString(
      compose(
        translate(ax, ay),
        rotate((-ccw_rotation * Math.PI) / 180),
        ...(applyMirror ? [scale(-1, 1)] : []),
        scale(scaleFactor, scaleFactor),
      ),
    )

    // Generate unique mask ID
    const maskId = `knockout-mask-${pcbCopperText.pcb_copper_text_id}-${maskIdCounter++}`

    // Use SVG mask for knockout effect:
    // - White background in mask = visible copper
    // - Black text strokes in mask = cutout (transparent)
    // This uses native SVG stroke rendering with round caps/joins for perfect cuts
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
              // White background - area that will show copper
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
              // Black text strokes - area that will be cut out
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

  //--------------------------------------
  // NORMAL TEXT MODE
  //--------------------------------------
  // Scale font size to match SVG text rendering
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
