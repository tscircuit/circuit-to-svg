import { ALPHABET_FONT_FAMILY } from "lib/utils/stringify-svg"
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
import { getAnchorOffsetForBounds } from "./create-pcb-alphabet-text-geometry"
import { createAlphabetKnockoutText } from "./create-alphabet-knockout-text"

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
  const safeFontSize =
    typeof font_size === "number" && Number.isFinite(font_size) && font_size > 0
      ? font_size
      : 1
  const silkscreenColor =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  const isBottom = layer === "bottom"
  const applyMirror = isBottom ? true : is_mirrored === true

  // Handle knockout rendering
  if (is_knockout) {
    const geometry = createAlphabetKnockoutText(text, safeFontSize)
    if (!geometry.bounds) return []

    const padLeft = knockout_padding?.left ?? safeFontSize * 0.5
    const padRight = knockout_padding?.right ?? safeFontSize * 0.5
    const padTop = knockout_padding?.top ?? safeFontSize * 0.3
    const padBottom = knockout_padding?.bottom ?? safeFontSize * 0.3

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
      geometry.textNode,
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

  const transformedFontSize = safeFontSize * scaleFactor

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
        "font-family": ALPHABET_FONT_FAMILY,
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
