import type { PcbPlatedHole, PcbSmtPad } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { getPadPinNumber } from "./get-pad-data-attributes"
import { getPolygonPadRotator } from "../get-polygon-pad-rotator"

type PcbPad = PcbSmtPad | PcbPlatedHole

interface PadTextGeometry {
  centerX: number
  centerY: number
  width: number
  height: number
  ccwRotation: number
}

const MAX_FONT_SIZE = 0.5
const FONT_HEIGHT_RATIO = 0.42
const FONT_WIDTH_RATIO = 0.58
const HORIZONTAL_PADDING_RATIO = 0.75

export function createSvgObjectFromPcbPadPinNumber(
  pad: PcbPad,
  ctx: PcbContext,
): SvgObject[] {
  if (!ctx.showPinNumbers) return []

  if (pad.type === "pcb_smtpad") {
    if (ctx.layer && pad.layer !== ctx.layer) return []
  } else if (ctx.layer && !pad.layers.includes(ctx.layer)) {
    return []
  }

  const pinNumber = getPadPinNumber(pad, ctx.circuitJson)
  if (!pinNumber) return []

  const geometry = getPadTextGeometry(pad)
  if (!geometry || geometry.width <= 0 || geometry.height <= 0) return []

  const scaleFactor = Math.abs(ctx.transform.a)
  const fontSizeInCircuitUnits = Math.min(
    MAX_FONT_SIZE,
    geometry.height * FONT_HEIGHT_RATIO,
    (geometry.width * HORIZONTAL_PADDING_RATIO) /
      (pinNumber.length * FONT_WIDTH_RATIO),
  )
  if (fontSizeInCircuitUnits <= 0) return []

  const [x, y] = applyToPoint(ctx.transform, [
    geometry.centerX,
    geometry.centerY,
  ])
  const layer = pad.type === "pcb_smtpad" ? pad.layer : "through"
  const transform = geometry.ccwRotation
    ? `rotate(${-geometry.ccwRotation} ${x} ${y})`
    : undefined

  return [
    {
      name: "text",
      type: "element",
      value: "",
      attributes: {
        class: "pcb-pad-pin-number",
        x: x.toString(),
        y: y.toString(),
        fill: "#b0b0b0",
        "font-family": "Arial, sans-serif",
        "font-size": (fontSizeInCircuitUnits * scaleFactor).toString(),
        "font-weight": "500",
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "pointer-events": "none",
        "data-type": "pcb_pad_pin_number",
        "data-pcb-layer": layer,
        "data-pin-number": pinNumber,
        ...(transform ? { transform } : {}),
      },
      children: [
        {
          type: "text",
          value: pinNumber,
          name: "",
          attributes: {},
          children: [],
        },
      ],
    },
  ]
}

function getPadTextGeometry(pad: PcbPad): PadTextGeometry | undefined {
  if (pad.type === "pcb_smtpad") {
    if (pad.shape === "polygon") {
      return getPolygonGeometry(pad.points)
    }

    if (pad.shape === "circle") {
      return {
        centerX: pad.x,
        centerY: pad.y,
        width: pad.radius * 2,
        height: pad.radius * 2,
        ccwRotation: 0,
      }
    }

    return {
      centerX: pad.x,
      centerY: pad.y,
      width: pad.width,
      height: pad.height,
      ccwRotation:
        pad.shape === "rotated_rect" || pad.shape === "rotated_pill"
          ? pad.ccw_rotation
          : 0,
    }
  }

  if (pad.shape === "circle") {
    return {
      centerX: pad.x,
      centerY: pad.y,
      width: pad.outer_diameter,
      height: pad.outer_diameter,
      ccwRotation: 0,
    }
  }

  if (pad.shape === "oval" || pad.shape === "pill") {
    return {
      centerX: pad.x,
      centerY: pad.y,
      width: pad.outer_width,
      height: pad.outer_height,
      ccwRotation: pad.ccw_rotation,
    }
  }

  if (pad.shape === "hole_with_polygon_pad") {
    const rotatePoint = getPolygonPadRotator(pad.ccw_rotation)
    const polygonGeometry = getPolygonGeometry(
      (pad.pad_outline ?? []).map((point) => rotatePoint(point)),
    )
    if (!polygonGeometry) return undefined

    return {
      ...polygonGeometry,
      centerX: pad.x + polygonGeometry.centerX,
      centerY: pad.y + polygonGeometry.centerY,
      ccwRotation: 0,
    }
  }

  if ("rect_pad_width" in pad) {
    return {
      centerX: pad.x,
      centerY: pad.y,
      width: pad.rect_pad_width,
      height: pad.rect_pad_height,
      ccwRotation:
        pad.shape === "rotated_pill_hole_with_rect_pad"
          ? pad.rect_ccw_rotation
          : pad.shape === "circular_hole_with_rect_pad"
            ? (pad.rect_ccw_rotation ?? 0)
            : 0,
    }
  }

  return undefined
}

function getPolygonGeometry(
  points: Array<{ x: number; y: number }>,
): PadTextGeometry | undefined {
  if (points.length === 0) return undefined

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
    ccwRotation: 0,
  }
}
