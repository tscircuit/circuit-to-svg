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
import { getFont } from "@tscircuit/alphabet"
import {
  createPcbAlphabetTextGeometry,
  getAnchorOffsetForBounds,
} from "./create-pcb-alphabet-text-geometry"

const CHAR_WIDTH = 1.0
const CHAR_SPACING = 0.2
const LINE_HEIGHT = 1.4
const FONT_SCALE = 0.53

let maskIdCounter = 0

export function createSvgObjectsFromPcbCopperText(
  pcbCopperText: PcbCopperText,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: filterLayer, colorMap } = ctx
  const {
    anchor_position,
    text,
    font = "tscircuit2024",
    font_size = "0.2mm",
    layer,
    ccw_rotation = 0,
    anchor_alignment = "center",
    is_knockout = false,
    knockout_padding,
    is_mirrored = false,
  } = pcbCopperText

  /** W15.P4: per-text font dispatch via getFont(font). */
  const { lineAlphabet: fontLineAlphabet } = getFont(font)

  const layerName = layer ?? "top"

  if (filterLayer && filterLayer !== layerName) return []
  if (!anchor_position) return []
  if (!text) return []

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
    const geometry = createPcbAlphabetTextGeometry({
      text,
      anchorAlignment: anchor_alignment,
      fontSize: scaledFontSize,
      charAdvance: (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize,
      spaceAdvance: (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize * 0.6,
      trailingSpacing: CHAR_SPACING * scaledFontSize,
      lineHeight: scaledFontSize * LINE_HEIGHT,
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
  const geometry = createPcbAlphabetTextGeometry({
    text,
    anchorAlignment: anchor_alignment,
    fontSize: scaledFontSize,
    charAdvance: (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize,
    spaceAdvance: (CHAR_WIDTH + CHAR_SPACING) * scaledFontSize * 0.6,
    trailingSpacing: CHAR_SPACING * scaledFontSize,
    lineHeight: scaledFontSize * LINE_HEIGHT,
    mapSegment: (segment, offsetX, offsetY, fontSize) => ({
      x1: offsetX + segment.x1 * fontSize,
      y1: offsetY + (1 - segment.y1) * fontSize,
      x2: offsetX + segment.x2 * fontSize,
      y2: offsetY + (1 - segment.y2) * fontSize,
    }),
  })
  if (!geometry.pathData) return []

  const textTransform = matrixToString(
    compose(
      translate(ax, ay),
      rotate((-ccw_rotation * Math.PI) / 180),
      ...(applyMirror ? [scale(-1, 1)] : []),
      scale(scaleFactor, scaleFactor),
    ),
  )

  const strokeWidth = scaledFontSize * 0.15

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        d: geometry.pathData,
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
