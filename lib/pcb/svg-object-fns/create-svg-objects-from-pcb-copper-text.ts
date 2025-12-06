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
import { svgAlphabet } from "@tscircuit/alphabet"

// Character spacing constants
const CHAR_WIDTH = 1.0
const CHAR_SPACING = 0.2
const LINE_HEIGHT = 1.4

type AlphabetKey = keyof typeof svgAlphabet

/**
 * Transform a normalized SVG path (0–1 range) to actual coordinates.
 */
function transformPathData(
  pathData: string,
  offsetX: number,
  offsetY: number,
  charScale: number,
): string {
  return pathData.replace(
    /([ML])\s*([-\d.]+)\s+([-\d.]+)|([Q])\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/g,
    (match, cmd1, x1, y1, cmd2, qx1, qy1, qx2, qy2) => {
      if (cmd1) {
        const x = offsetX + Number.parseFloat(x1) * charScale
        const y = offsetY + Number.parseFloat(y1) * charScale
        return `${cmd1}${x} ${y}`
      }
      if (cmd2) {
        const cx = offsetX + Number.parseFloat(qx1) * charScale
        const cy = offsetY + Number.parseFloat(qy1) * charScale
        const x = offsetX + Number.parseFloat(qx2) * charScale
        const y = offsetY + Number.parseFloat(qy2) * charScale
        return `${cmd2}${cx} ${cy} ${x} ${y}`
      }
      return match
    },
  )
}

/**
 * Convert a single line to an alphabet path.
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

    const path = svgAlphabet[char as AlphabetKey]
    if (path) {
      paths.push(transformPathData(path, x, 0, fontSize))
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
  const lines = text.split("\n")
  const lineHeight = fontSize * LINE_HEIGHT
  const totalHeight = lines.length * lineHeight

  const lineWidths: number[] = []
  let maxWidth = 0

  for (const line of lines) {
    const { width } = textToAlphabetPath(line, fontSize)
    lineWidths.push(width)
    if (width > maxWidth) maxWidth = width
  }

  const paths: string[] = []
  let y = -totalHeight / 2

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const lineWidth = lineWidths[i]!
    const charAdvance = (CHAR_WIDTH + CHAR_SPACING) * fontSize
    let x = -lineWidth / 2

    for (const char of line) {
      if (char === " ") {
        x += charAdvance * 0.6
        continue
      }

      const glyphPath = svgAlphabet[char as AlphabetKey]
      if (glyphPath) {
        paths.push(transformPathData(glyphPath, x, y, fontSize))
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
    const { pathData, width, height } = textToCenteredAlphabetPaths(
      text,
      fontSizeNum,
    )

    const padX = knockout_padding?.left ?? fontSizeNum * 0.5
    const padY = knockout_padding?.top ?? fontSizeNum * 0.3

    const rectW = width + padX * 2
    const rectH = height + padY * 2

    // Stroke width for text cutout - matches normal text rendering
    const strokeWidth = fontSizeNum * 0.15

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
  const { pathData, width, height } = textToCenteredAlphabetPaths(
    text,
    fontSizeNum,
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

  const strokeWidth = fontSizeNum * 0.15

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
