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

// Color mapping for different pin types
const PIN_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  power: { bg: "rgb(200, 50, 50)", color: "rgb(255, 255, 255)" },
  ground: { bg: "rgb(50, 50, 50)", color: "rgb(255, 255, 255)" },
  gpio: { bg: "rgb(50, 150, 50)", color: "rgb(255, 255, 255)" },
  spi: { bg: "rgb(50, 50, 200)", color: "rgb(255, 255, 255)" },
  i2c: { bg: "rgb(200, 100, 50)", color: "rgb(255, 255, 255)" },
  uart: { bg: "rgb(150, 50, 150)", color: "rgb(255, 255, 255)" },
  adc: { bg: "rgb(50, 150, 150)", color: "rgb(255, 255, 255)" },
  usb: { bg: "rgb(200, 150, 50)", color: "rgb(0, 0, 0)" },
}

// Detect pin type from label text
function detectPinType(label: string): string | null {
  const labelLower = label.toLowerCase()
  if (labelLower.includes("vcc") || labelLower.includes("vsys") || labelLower.includes("3v3") || labelLower.includes("vbus") || labelLower.includes("adc_vref")) return "power"
  if (labelLower.includes("gnd") || labelLower.includes("agnd")) return "ground"
  if (labelLower.includes("spi")) return "spi"
  if (labelLower.includes("i2c")) return "i2c"
  if (labelLower.includes("uart") || labelLower.includes("tx") || labelLower.includes("rx")) return "uart"
  if (labelLower.includes("adc")) return "adc"
  if (labelLower.includes("usb")) return "usb"
  if (labelLower.match(/gp\d+/) || labelLower.includes("gpio")) return "gpio"
  return null
}

// Format long label with underscores into shorter segments
function formatMultiLabel(text: string, maxLen: number = 12): string[] {
  if (text.length <= maxLen) return [text]
  
  // Split by underscores and try to create meaningful segments
  const parts = text.split("_")
  const segments: string[] = []
  let current = ""
  
  for (const part of parts) {
    if ((current + "_" + part).length <= maxLen && current) {
      current = current + "_" + part
    } else if (current) {
      segments.push(current)
      current = part
    } else {
      current = part
    }
  }
  if (current) segments.push(current)
  
  return segments
}

export type FacingDirection = "x-" | "x+" | "y-" | "y+"

export function createSvgObjectsFromPinoutPort(
  pcb_port: PcbPort,
  ctx: PinoutSvgContext,
): SvgObject[] {
  const label_info = ctx.label_positions.get(pcb_port.pcb_port_id)
  if (!label_info) return []

  const { text: label, aliases, elbow_end, label_pos, edge } = label_info

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
  const numberMatch = /^pin(\d+)$/i.exec(label)
  
  // Get custom color from port attributes if available
  const portColor = (pcb_port as any).pin_color as string | undefined
  const portBg = (pcb_port as any).pin_background as string | undefined
  
  // Detect pin type for automatic coloring
  const pinType = detectPinType(label)
  const typeColors = pinType ? PIN_TYPE_COLORS[pinType] : null
  
  // Determine colors: custom > type-based > default
  const getColors = (text: string, isPinNumber: boolean) => {
    if (isPinNumber) {
      return { bg: PIN_NUMBER_BACKGROUND, color: PIN_NUMBER_COLOR }
    }
    if (portBg && portColor) {
      return { bg: portBg, color: portColor }
    }
    if (typeColors) {
      return typeColors
    }
    return { bg: LABEL_BACKGROUND, color: LABEL_COLOR }
  }
  
  // Format main label into multiple segments if it's long
  const mainLabelText = numberMatch ? numberMatch[1]! : label
  const mainLabelSegments = formatMultiLabel(mainLabelText)
  
  const tokensWithStyle = [
    ...mainLabelSegments.map((segment, idx) => {
      const isPinNumber = !!(numberMatch && idx === 0)
      const colors = getColors(segment, isPinNumber)
      return {
        text: segment,
        bg: colors.bg,
        color: colors.color,
      }
    }),
    ...aliases.flatMap((alias) => {
      const segments = formatMultiLabel(alias)
      return segments.map((segment) => {
        const colors = getColors(segment, false)
        return {
          text: segment,
          bg: colors.bg,
          color: colors.color,
        }
      })
    }),
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
