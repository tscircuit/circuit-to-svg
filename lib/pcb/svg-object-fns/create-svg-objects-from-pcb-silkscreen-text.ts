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
import { createPcbSilkscreenAnchorOffsetIndicators } from "../../utils/create-pcb-silkscreen-anchor-offset-indicators"
import { estimateTextWidth } from "../../sch/estimate-text-width"

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
  } = pcbSilkscreenText

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

  const transformedFontSize = font_size * Math.abs(transform.a)

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
    rotate((-ccw_rotation * Math.PI) / 180), // Negate to make counter-clockwise
    ...(layer === "bottom" ? [scale(-1, 1)] : []),
  )

  const color =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

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
      fill: color,
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

  const svgObjects: SvgObject[] = [svgObject]

  // Add anchor offset indicators if enabled
  if (ctx.showAnchorOffsets && anchor_position) {
    const renderedPosition = calculateRenderedTextPosition(
      anchor_position,
      anchor_alignment,
      text,
      font_size,
    )

    svgObjects.push(
      ...createPcbSilkscreenAnchorOffsetIndicators({
        anchorPosition: anchor_position,
        renderedPosition,
        transform,
      }),
    )
  }

  return svgObjects
}

function calculateRenderedTextPosition(
  anchorPos: { x: number; y: number },
  alignment: string,
  text: string,
  fontSize: number,
): { x: number; y: number } {
  const textWidthFSR = estimateTextWidth(text)
  const textWidth = textWidthFSR * fontSize
  const textHeight = fontSize

  let x = anchorPos.x
  let y = anchorPos.y

  // Adjust X based on alignment
  if (alignment.includes("left")) {
    x += textWidth / 2
  } else if (alignment.includes("right")) {
    x -= textWidth / 2
  }

  // Adjust Y based on alignment
  if (alignment.includes("top")) {
    y += textHeight / 2
  } else if (alignment.includes("bottom")) {
    y -= textHeight / 2
  }

  return { x, y }
}
