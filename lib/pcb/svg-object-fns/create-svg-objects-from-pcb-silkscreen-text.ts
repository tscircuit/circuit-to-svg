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
import { getFont } from "@tscircuit/alphabet"
import {
  createPcbAlphabetTextGeometry,
  getAnchorOffsetForBounds,
} from "./create-pcb-alphabet-text-geometry"

/**
 * W15.P4 (EnergyCitizen fork): bounds derivation moved INSIDE the
 * render function so it picks per-text font. Each pcb_silkscreen_text
 * with font="ubuntu" gets Ubuntu glyph metrics; default font keeps
 * tscircuit2024 metrics. Bounds cached per-font for performance.
 */
const alphabetBoundsCache = new Map<
  string,
  { width: number; height: number }
>()

const getAlphabetBounds = (fontName: string) => {
  const cached = alphabetBoundsCache.get(fontName)
  if (cached) return cached
  const { lineAlphabet } = getFont(fontName)
  let maxX = 0
  let minY = Infinity
  let maxY = -Infinity
  for (const segments of Object.values(lineAlphabet)) {
    for (const seg of segments) {
      maxX = Math.max(maxX, seg.x1, seg.x2)
      minY = Math.min(minY, seg.y1, seg.y2)
      maxY = Math.max(maxY, seg.y1, seg.y2)
    }
  }
  const result = { width: maxX, height: maxY - minY }
  alphabetBoundsCache.set(fontName, result)
  return result
}

/** Inter-character spacing as a fraction of cell width (20% gap between chars) */
const INTER_CHAR_SPACING_RATIO = 0.2
/** Line-height multiplier for multi-line text (10% extra vertical space) */
const LINE_HEIGHT_MULTIPLIER = 1.1

let silkscreenMaskIdCounter = 0

export function createSvgObjectsFromPcbSilkscreenText(
  pcbSilkscreenText: PcbSilkscreenText,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    anchor_position,
    text,
    font = "tscircuit2024",
    font_size = 1,
    layer = "top",
    ccw_rotation = 0,
    anchor_alignment = "center",
    is_knockout = false,
    knockout_padding,
    is_mirrored = false,
  } = pcbSilkscreenText

  /** W15.P4: per-text font dispatch via getFont(font). */
  const alphabetBounds = getAlphabetBounds(font)
  const { lineAlphabet: fontLineAlphabet } = getFont(font)

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
  if (!text) return []

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
    const charSpacing = alphabetBounds.width * INTER_CHAR_SPACING_RATIO
    const geometry = createPcbAlphabetTextGeometry({
      text,
      anchorAlignment: anchor_alignment,
      fontSize: scaledFontSize,
      charAdvance: (alphabetBounds.width + charSpacing) * scaledFontSize,
      spaceAdvance: (alphabetBounds.width + charSpacing) * scaledFontSize * 0.6,
      trailingSpacing: charSpacing * scaledFontSize,
      lineHeight:
        scaledFontSize * alphabetBounds.height * LINE_HEIGHT_MULTIPLIER,
      lineAlphabet: fontLineAlphabet,
      mapSegment: (segment, offsetX, offsetY, fontSize) => ({
        x1: offsetX + segment.x1 * fontSize,
        y1: offsetY + (1 - segment.y1) * fontSize,
        x2: offsetX + segment.x2 * fontSize,
        y2: offsetY + (1 - segment.y2) * fontSize,
      }),
    })
    if (!geometry.bounds || !geometry.pathData) return []

    const padLeft = knockout_padding?.left ?? scaledFontSize * 0.5
    const padRight = knockout_padding?.right ?? scaledFontSize * 0.5
    const padTop = knockout_padding?.top ?? scaledFontSize * 0.3
    const padBottom = knockout_padding?.bottom ?? scaledFontSize * 0.3

    const rectX = geometry.bounds.minX - padLeft
    const rectY = geometry.bounds.minY - padTop
    const rectW =
      geometry.bounds.maxX - geometry.bounds.minX + padLeft + padRight
    const rectH =
      geometry.bounds.maxY - geometry.bounds.minY + padTop + padBottom
    const strokeWidth = scaledFontSize * 0.15
    const knockoutBounds = {
      minX: rectX,
      minY: rectY,
      maxX: rectX + rectW,
      maxY: rectY + rectH,
    }
    const knockoutAnchorOffset = getAnchorOffsetForBounds(
      anchor_alignment,
      knockoutBounds,
    )
    const alignedRectX = rectX + knockoutAnchorOffset.x
    const alignedRectY = rectY + knockoutAnchorOffset.y
    const maskCutoutChildren: SvgObject[] = [
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
          d: geometry.pathData,
          fill: "none",
          stroke: "black",
          "stroke-width": strokeWidth.toString(),
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        },
        children: [],
      },
    ]
    const hasKnockoutAnchorOffset =
      knockoutAnchorOffset.x !== 0 || knockoutAnchorOffset.y !== 0
    const maskChildren: SvgObject[] = hasKnockoutAnchorOffset
      ? [
          {
            name: "g",
            type: "element",
            value: "",
            attributes: {
              transform: `translate(${knockoutAnchorOffset.x} ${knockoutAnchorOffset.y})`,
            },
            children: maskCutoutChildren,
          },
        ]
      : maskCutoutChildren

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
            children: maskChildren,
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
          x: alignedRectX.toString(),
          y: alignedRectY.toString(),
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

  const transformedFontSize = font_size * scaleFactor

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

  const textTransform = compose(
    translate(transformedX, transformedY),
    rotate((-ccw_rotation * Math.PI) / 180),
    ...(applyMirror ? [scale(-1, 1)] : []),
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

  return [
    {
      name: "text",
      type: "element",
      attributes: {
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
        "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_silkscreen_text_id,
        stroke: "none",
        "data-type": "pcb_silkscreen_text",
        "data-pcb-layer": layer,
      },
      children,
      value: "",
    },
  ]
}
