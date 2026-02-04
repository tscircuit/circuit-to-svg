import type { PcbPort } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PinoutSvgContext } from "../convert-circuit-json-to-pinout-svg"
import { calculateElbow } from "calculate-elbow"
import { createPinoutLabelBox } from "./pinout-label-box"

const LABEL_COLOR = "rgb(255, 255, 255)"
const LABEL_BACKGROUND = "rgb(0, 0, 0)"
const LINE_COLOR = "rgba(0, 0, 0, 0.6)"
const PIN_NUMBER_BACKGROUND = "rgb(200, 200, 200)"
const PIN_NUMBER_COLOR = "rgb(0, 0, 0)"

export type FacingDirection = "x-" | "x+" | "y-" | "y+"

export function createSvgObjectsFromPinoutPort(
  pcb_port: PcbPort,
  ctx: PinoutSvgContext,
): SvgObject[] {
  const label_info = ctx.label_positions.get(pcb_port.pcb_port_id)
  if (!label_info) return []

  const {
    text: label,
    aliases,
    elbow_end,
    label_pos,
    edge,
    highlight_color,
  } = label_info

  const [port_x, port_y] = applyToPoint(ctx.transform, [pcb_port.x, pcb_port.y])

  const start_facing_direction: FacingDirection =
    edge === "left"
      ? "x-"
      : edge === "right"
        ? "x+"
        : edge === "top"
          ? "y-"
          : "y+"

  const end_facing_direction: FacingDirection =
    edge === "left"
      ? "x+"
      : edge === "right"
        ? "x-"
        : edge === "top"
          ? "y+"
          : "y-"

  const elbow_path = calculateElbow(
    {
      x: port_x,
      y: port_y,
      facingDirection: start_facing_direction,
    },
    {
      x: elbow_end.x,
      y: elbow_end.y,
      facingDirection: end_facing_direction,
    },
    {},
  )

  // Build tokens with style; if first token is "pin{number}", show number with gray bg and black text
  // If highlight_color is provided, use it as background for non-pin-number tokens
  const numberMatch = /^pin(\d+)$/i.exec(label)
  const labelBg = highlight_color ?? LABEL_BACKGROUND
  const tokensWithStyle = [
    {
      text: numberMatch ? numberMatch[1] : label,
      bg: numberMatch ? PIN_NUMBER_BACKGROUND : labelBg,
      color: numberMatch ? PIN_NUMBER_COLOR : LABEL_COLOR,
    },
    ...aliases.map((t) => ({
      text: t,
      bg: labelBg,
      color: LABEL_COLOR,
    })),
  ]

  const pxPerMm = Math.abs(ctx.transform.a) // px per mm from transform matrix
  const labelScale = ctx.styleScale ?? 1
  const LABEL_RECT_HEIGHT_MM = 1.6 * labelScale
  const rectHeight = LABEL_RECT_HEIGHT_MM * pxPerMm
  const STROKE_WIDTH_MM = Math.max(0.08, 0.25 * labelScale)
  const CORNER_RADIUS_MM = 0.3 * labelScale
  const cornerRadius = CORNER_RADIUS_MM * pxPerMm

  const strokeWidthPx = STROKE_WIDTH_MM * pxPerMm
  const end_point = {
    x: label_pos.x + (edge === "left" ? -strokeWidthPx / 2 : strokeWidthPx / 2),
    y: label_pos.y,
  }
  const line_points = [...elbow_path, end_point]
    .map((p) => `${p.x},${p.y}`)
    .join(" ")

  // Derive font size and padding from rect height to keep text centered
  // Based on original ratio of font-size 11 to rect-height 21
  const fontSize = rectHeight * (11 / 21)
  const bgPadding = (rectHeight - fontSize) / 2
  const gap = bgPadding

  const tokenRects = tokensWithStyle.map(({ text, bg, color }) => {
    const safeText = text ?? ""
    const textWidth = safeText.length * fontSize * 0.6
    const rectWidth = textWidth + 2 * bgPadding
    return { text: safeText, rectWidth, bg, color }
  })

  const text_y = label_pos.y

  const objects: SvgObject[] = [
    {
      name: "polyline",
      type: "element",
      attributes: {
        points: line_points,
        stroke: LINE_COLOR,
        "stroke-width": (STROKE_WIDTH_MM * pxPerMm).toString(),
        fill: "none",
      },
      children: [],
      value: "",
    },
  ]

  if (edge === "left") {
    // Start near the board and place boxes outward to the left
    let currentX = label_pos.x
    for (const { text, rectWidth, bg, color } of tokenRects) {
      const rectX = currentX - rectWidth
      const text_x = rectX + rectWidth / 2

      objects.push(
        ...createPinoutLabelBox({
          rectX,
          rectY: text_y - rectHeight / 2,
          rectWidth,
          rectHeight,
          textX: text_x,
          textY: text_y,
          text,
          fontSize,
          labelBackground: bg,
          labelColor: color,
          rx: cornerRadius,
          ry: cornerRadius,
        }),
      )

      currentX = rectX - gap
    }
  } else if (edge === "right") {
    // Start near the board and place boxes outward to the right
    let currentX = label_pos.x
    for (const { text, rectWidth, bg, color } of tokenRects) {
      const rectX = currentX
      const text_x = rectX + rectWidth / 2

      objects.push(
        ...createPinoutLabelBox({
          rectX,
          rectY: text_y - rectHeight / 2,
          rectWidth,
          rectHeight,
          textX: text_x,
          textY: text_y,
          text,
          fontSize,
          labelBackground: bg,
          labelColor: color,
          rx: cornerRadius,
          ry: cornerRadius,
        }),
      )

      currentX = rectX + rectWidth + gap
    }
  } else {
    // Fallback: center all boxes around label_pos.x
    const totalWidth =
      tokenRects.reduce((acc, t) => acc + t.rectWidth, 0) +
      gap * Math.max(0, tokenRects.length - 1)
    let currentX = label_pos.x - totalWidth / 2

    for (const { text, rectWidth, bg, color } of tokenRects) {
      const rectX = currentX
      const text_x = rectX + rectWidth / 2

      objects.push(
        ...createPinoutLabelBox({
          rectX,
          rectY: text_y - rectHeight / 2,
          rectWidth,
          rectHeight,
          textX: text_x,
          textY: text_y,
          text,
          fontSize,
          labelBackground: bg,
          labelColor: color,
          rx: cornerRadius,
          ry: cornerRadius,
        }),
      )

      currentX = rectX + rectWidth + gap
    }
  }

  return objects
}
