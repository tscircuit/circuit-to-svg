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
import { estimateTextWidth } from "lib/sch/estimate-text-width"
import opentype, { type Font } from "opentype.js"

// ---------------------------------------------------------
// Load font synchronously (if available). If it fails,
// knockout still works using estimated text width.
// ---------------------------------------------------------
let syncFont: Font | null = null
try {
  syncFont = opentype.loadSync(
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  )
} catch {}

/**
 * Convert a single line of text into SVG path data
 */
function textToPathData(
  text: string,
  fontSize: number,
  x: number,
  y: number,
): string | null {
  if (!syncFont) return null
  const path = syncFont.getPath(text, x, y, fontSize)
  return path.toPathData(2)
}

/**
 * Measure real text bounding box using opentype.js
 */
function getTextBoundingBox(text: string, fontSize: number) {
  if (!syncFont) return null

  const asc = (syncFont.ascender / syncFont.unitsPerEm) * fontSize
  const desc = (syncFont.descender / syncFont.unitsPerEm) * fontSize
  const lineHeight = asc - desc
  const lines = text.split("\n")

  const width = Math.max(
    ...lines.map((l) => syncFont!.getAdvanceWidth(l, fontSize)),
  )

  return {
    width,
    height: lineHeight * lines.length,
    asc,
    lineHeight,
  }
}

/** Create rectangle path centered at (0,0) */
function createRectPath(w: number, h: number) {
  const hw = w / 2,
    hh = h / 2
  return `M ${-hw} ${-hh} L ${hw} ${-hh} L ${hw} ${hh} L ${-hw} ${hh} Z`
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

  const layerName =
    typeof layer === "string" ? layer : (layer as any)?.name || "top"

  if (filterLayer && filterLayer !== layerName) return []
  if (!anchor_position) return []

  const [ax, ay] = applyToPoint(transform, [
    anchor_position.x,
    anchor_position.y,
  ])

  const fontSizeNum = distance.parse(font_size) ?? 0.2
  const scaleFactor = Math.abs(transform.a)
  const effectiveFontSize = fontSizeNum * scaleFactor

  const lines = text.split("\n")
  const copperColor = layerNameToColor(layerName, colorMap)

  // -----------------------------------------------------------------
  //  KNOCKOUT MODE (rectangle with text cut-outs using evenodd rule)
  // -----------------------------------------------------------------
  if (is_knockout) {
    let box = getTextBoundingBox(text, fontSizeNum)

    let textWidth, textHeight, asc, lineHeight

    if (box) {
      textWidth = box.width
      textHeight = box.height
      asc = box.asc
      lineHeight = box.lineHeight
    } else {
      // fallback estimates
      const maxLine = Math.max(...lines.map((l) => estimateTextWidth(l)))
      textWidth = maxLine * fontSizeNum
      textHeight = fontSizeNum * lines.length
      asc = fontSizeNum * 0.8
      lineHeight = fontSizeNum
    }

    // padding
    const padX = knockout_padding?.left ?? fontSizeNum * 0.5
    const padY = knockout_padding?.top ?? fontSizeNum * 0.3

    const rectW = textWidth + padX * 2
    const rectH = textHeight + padY * 2

    // ---------------------------------------------------------
    // Generate actual text cutout paths
    // ---------------------------------------------------------
    let paths: string[] = []
    if (syncFont) {
      let y = -textHeight / 2 + asc
      for (const line of lines) {
        const w = syncFont.getAdvanceWidth(line, fontSizeNum)
        const x = -w / 2
        const d = textToPathData(line, fontSizeNum, x, y)
        if (d) paths.push(d)
        y += lineHeight
      }
    }

    // If no font loaded, still create clean rectangle only
    const combined = `${createRectPath(rectW, rectH)} ${paths.join(" ")}`

    return [
      {
        name: "path",
        type: "element",
        value: "",
        children: [],
        attributes: {
          d: combined,
          fill: copperColor,
          "fill-rule": "evenodd",
          transform: `translate(${ax} ${ay}) rotate(${-ccw_rotation}) scale(${scaleFactor})`,
          class: `pcb-copper-text-knockout pcb-copper-${layerName}`,
          "data-type": "pcb_copper_text",
          "data-pcb-copper-text-id": pcbCopperText.pcb_copper_text_id,
        },
      },
    ]
  }

  // --------------------------------------------
  // NORMAL TEXT (not knockout)
  // --------------------------------------------
  let anchor = "middle"
  let baseline = "central"

  switch (anchor_alignment) {
    case "top_left":
      anchor = "start"
      baseline = "text-before-edge"
      break
    case "top_center":
      anchor = "middle"
      baseline = "text-before-edge"
      break
    case "top_right":
      anchor = "end"
      baseline = "text-before-edge"
      break
    case "center_left":
      anchor = "start"
      break
    case "center_right":
      anchor = "end"
      break
    case "bottom_left":
      anchor = "start"
      baseline = "text-after-edge"
      break
    case "bottom_center":
      anchor = "middle"
      baseline = "text-after-edge"
      break
    case "bottom_right":
      anchor = "end"
      baseline = "text-after-edge"
      break
  }

  const textTransform = matrixToString(
    compose(
      translate(ax, ay),
      rotate((-ccw_rotation * Math.PI) / 180),
      ...(is_mirrored || layerName === "bottom" ? [scale(-1, 1)] : []),
    ),
  )

  const children: SvgObject[] =
    lines.length === 1
      ? [
          {
            type: "text",
            name: "",
            value: text,
            attributes: {},
            children: [],
          },
        ]
      : lines.map((line, i) => ({
          type: "element",
          name: "tspan",
          value: "",
          attributes: {
            x: "0",
            ...(i > 0 ? { dy: effectiveFontSize.toString() } : {}),
          },
          children: [
            {
              type: "text",
              name: "",
              value: line,
              attributes: {},
              children: [],
            },
          ],
        }))

  return [
    {
      name: "text",
      type: "element",
      value: "",
      children,
      attributes: {
        x: "0",
        y: "0",
        fill: copperColor,
        "font-family": "Arial, sans-serif",
        "font-size": effectiveFontSize.toString(),
        "text-anchor": anchor,
        "dominant-baseline": baseline,
        transform: textTransform,
        class: `pcb-copper-text pcb-copper-${layerName}`,
        stroke: "none",
        "data-type": "pcb_copper_text",
        "data-pcb-copper-text-id": pcbCopperText.pcb_copper_text_id,
      },
    },
  ]
}
