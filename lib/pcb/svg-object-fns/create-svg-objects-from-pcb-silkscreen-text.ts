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
import { textMetrics } from "@tscircuit/alphabet"
import {
  createPcbAlphabetTextGeometry,
  getAnchorOffsetForBounds,
} from "./create-pcb-alphabet-text-geometry"

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

  const letterSpacing = textMetrics.letterSpacingRatio * font_size
  const charAdvance =
    (textMetrics.glyphWidthRatio + textMetrics.letterSpacingRatio) * font_size
  const spaceAdvance =
    (textMetrics.spaceWidthRatio + textMetrics.letterSpacingRatio) * font_size
  const geometry = createPcbAlphabetTextGeometry({
    text,
    anchorAlignment: anchor_alignment,
    fontSize: font_size,
    charAdvance,
    spaceAdvance,
    trailingSpacing: letterSpacing,
    lineHeight: textMetrics.lineHeightRatio * font_size,
    mapSegment: (segment, offsetX, offsetY, fontSize) => ({
      x1: offsetX + segment.x1 * fontSize,
      y1: offsetY + (1 - segment.y1) * fontSize,
      x2: offsetX + segment.x2 * fontSize,
      y2: offsetY + (1 - segment.y2) * fontSize,
    }),
  })
  if (!geometry.pathData || !geometry.bounds) return []

  const strokeWidth = textMetrics.strokeWidthRatio * font_size

  // Handle knockout rendering
  if (is_knockout) {
    const padLeft = knockout_padding?.left ?? font_size * 0.5
    const padRight = knockout_padding?.right ?? font_size * 0.5
    const padTop = knockout_padding?.top ?? font_size * 0.3
    const padBottom = knockout_padding?.bottom ?? font_size * 0.3

    const rectX = geometry.bounds.minX - padLeft
    const rectY = geometry.bounds.minY - padTop
    const rectW =
      geometry.bounds.maxX - geometry.bounds.minX + padLeft + padRight
    const rectH =
      geometry.bounds.maxY - geometry.bounds.minY + padTop + padBottom
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

  const textTransform = matrixToString(
    compose(
      translate(transformedX, transformedY),
      rotate((-ccw_rotation * Math.PI) / 180),
      ...(applyMirror ? [scale(-1, 1)] : []),
      scale(scaleFactor, scaleFactor),
    ),
  )

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        d: geometry.pathData,
        fill: "none",
        stroke: silkscreenColor,
        "stroke-width": strokeWidth.toString(),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        transform: textTransform,
        class: `pcb-silkscreen-text pcb-silkscreen-${layer}`,
        "data-pcb-silkscreen-text-id": pcbSilkscreenText.pcb_silkscreen_text_id,
        "data-type": "pcb_silkscreen_text",
        "data-pcb-layer": layer,
      },
      children: [],
      value: "",
    },
  ]
}
