import type { PcbFabricationNoteDimension } from "circuit-json"
import { debugPcb } from "lib/utils/debug"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

interface Point2D {
  x: number
  y: number
}

function normalize(vector: Point2D): Point2D {
  const length = Math.hypot(vector.x, vector.y) || 1
  return { x: vector.x / length, y: vector.y / length }
}

const TEXT_OFFSET_MULTIPLIER = 1.5 // Text offset multiplier relative to arrow size
const CHARACTER_WIDTH_MULTIPLIER = 0.6 // Approximate character width relative to font size
const TEXT_INTERSECTION_PADDING_MULTIPLIER = 0.3 // Padding multiplier to prevent text-line intersection

function toPath(points: Point2D[]): string {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(" ")
}

export function createSvgObjectsFromPcbFabricationNoteDimension(
  dimension: PcbFabricationNoteDimension,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter } = ctx
  const {
    from,
    to,
    text,
    font_size = 1,
    color,
    arrow_size,
    layer,
    pcb_component_id,
    pcb_fabrication_note_dimension_id,
    offset_distance,
    offset_direction,
    text_ccw_rotation,
  } = dimension

  if (layerFilter && layer && layer !== layerFilter) return []

  if (!from || !to || typeof from !== "object" || typeof to !== "object") {
    debugPcb(
      `[pcb_fabrication_note_dimension] Invalid endpoints for "${pcb_fabrication_note_dimension_id}": expected {from: {x, y}, to: {x, y}}, got from=${JSON.stringify(from)}, to=${JSON.stringify(to)}`,
    )
    return []
  }

  if (
    typeof (from as Point2D).x !== "number" ||
    typeof (from as Point2D).y !== "number" ||
    typeof (to as Point2D).x !== "number" ||
    typeof (to as Point2D).y !== "number"
  ) {
    debugPcb(
      `[pcb_fabrication_note_dimension] Invalid point values for "${pcb_fabrication_note_dimension_id}": x and y must be numbers, got from=${JSON.stringify(from)}, to=${JSON.stringify(to)}`,
    )
    return []
  }

  const numericArrowSize =
    typeof arrow_size === "number" ? arrow_size : undefined

  if (
    numericArrowSize === undefined ||
    !Number.isFinite(numericArrowSize) ||
    numericArrowSize <= 0
  ) {
    debugPcb(
      `[pcb_fabrication_note_dimension] Invalid arrow_size for "${pcb_fabrication_note_dimension_id}": expected positive number, got ${JSON.stringify(arrow_size)}`,
    )
    return []
  }

  const arrowSize = numericArrowSize

  const direction = normalize({ x: to.x - from.x, y: to.y - from.y })

  if (Number.isNaN(direction.x) || Number.isNaN(direction.y)) {
    return []
  }

  const perpendicular = { x: -direction.y, y: direction.x }

  const hasOffsetDirection =
    offset_direction &&
    typeof offset_direction.x === "number" &&
    typeof offset_direction.y === "number"

  const normalizedOffsetDirection = hasOffsetDirection
    ? normalize({ x: offset_direction.x, y: offset_direction.y })
    : { x: 0, y: 0 }

  const offsetMagnitude =
    typeof offset_distance === "number" ? offset_distance : 0

  const offsetVector = {
    x: normalizedOffsetDirection.x * offsetMagnitude,
    y: normalizedOffsetDirection.y * offsetMagnitude,
  }

  const applyOffset = (point: Point2D): Point2D => ({
    x: point.x + offsetVector.x,
    y: point.y + offsetVector.y,
  })

  const fromOffset = applyOffset(from)
  const toOffset = applyOffset(to)

  const arrowHalfWidth = arrowSize / 2

  const fromBase = {
    x: fromOffset.x + direction.x * arrowSize,
    y: fromOffset.y + direction.y * arrowSize,
  }

  const toBase = {
    x: toOffset.x - direction.x * arrowSize,
    y: toOffset.y - direction.y * arrowSize,
  }

  const fromTriangle = [
    toScreen(fromOffset),
    toScreen({
      x: fromBase.x + perpendicular.x * arrowHalfWidth,
      y: fromBase.y + perpendicular.y * arrowHalfWidth,
    }),
    toScreen({
      x: fromBase.x - perpendicular.x * arrowHalfWidth,
      y: fromBase.y - perpendicular.y * arrowHalfWidth,
    }),
  ]

  const toTriangle = [
    toScreen(toOffset),
    toScreen({
      x: toBase.x + perpendicular.x * arrowHalfWidth,
      y: toBase.y + perpendicular.y * arrowHalfWidth,
    }),
    toScreen({
      x: toBase.x - perpendicular.x * arrowHalfWidth,
      y: toBase.y - perpendicular.y * arrowHalfWidth,
    }),
  ]

  const [lineStartX, lineStartY] = applyToPoint(transform, [
    fromBase.x,
    fromBase.y,
  ])
  const [lineEndX, lineEndY] = applyToPoint(transform, [toBase.x, toBase.y])

  const strokeWidth = (arrowSize / 5) * Math.abs(transform.a)
  const lineColor = color || "rgba(255,255,255,0.5)"

  const extensionDirection =
    hasOffsetDirection &&
    (Math.abs(normalizedOffsetDirection.x) > Number.EPSILON ||
      Math.abs(normalizedOffsetDirection.y) > Number.EPSILON)
      ? normalizedOffsetDirection
      : perpendicular

  const extensionLength = offsetMagnitude + arrowSize

  const createExtensionLine = (anchor: Point2D): SvgObject => {
    const endPoint = {
      x: anchor.x + extensionDirection.x * extensionLength,
      y: anchor.y + extensionDirection.y * extensionLength,
    }

    const [startX, startY] = applyToPoint(transform, [anchor.x, anchor.y])
    const [endX, endY] = applyToPoint(transform, [endPoint.x, endPoint.y])

    return {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `M ${startX} ${startY} L ${endX} ${endY}`,
        stroke: lineColor,
        fill: "none",
        "stroke-width": strokeWidth.toString(),
        "stroke-linecap": "round",
        class: "pcb-fabrication-note-dimension-extension",
      },
      children: [],
    }
  }

  const extensionSegments = [createExtensionLine(from), createExtensionLine(to)]

  const midPoint = {
    x: (from.x + to.x) / 2 + offsetVector.x,
    y: (from.y + to.y) / 2 + offsetVector.y,
  }

  // Calculate text angle first to determine if we need additional offset
  const [screenFromX, screenFromY] = applyToPoint(transform, [
    fromOffset.x,
    fromOffset.y,
  ])
  const [screenToX, screenToY] = applyToPoint(transform, [
    toOffset.x,
    toOffset.y,
  ])

  const screenDirection = normalize({
    x: screenToX - screenFromX,
    y: screenToY - screenFromY,
  })

  let textAngle =
    (Math.atan2(screenDirection.y, screenDirection.x) * 180) / Math.PI

  if (textAngle > 90 || textAngle < -90) {
    textAngle += 180
  }

  // Apply text_ccw_rotation if provided (in degrees, subtract because SVG rotate is clockwise)
  const finalTextAngle =
    typeof text_ccw_rotation === "number" && Number.isFinite(text_ccw_rotation)
      ? textAngle - text_ccw_rotation
      : textAngle

  // Calculate additional offset to prevent text from intersecting the line when rotated
  let additionalOffset = 0
  if (
    text &&
    typeof text_ccw_rotation === "number" &&
    Number.isFinite(text_ccw_rotation)
  ) {
    // Estimate text dimensions (approximate for Arial font)
    const textWidth = text.length * font_size * CHARACTER_WIDTH_MULTIPLIER
    const textHeight = font_size

    // Calculate how much the rotated text extends toward the line
    // The text is rotated by text_ccw_rotation relative to the line direction
    const rotationRad = (text_ccw_rotation * Math.PI) / 180
    const sinRot = Math.abs(Math.sin(rotationRad))
    const cosRot = Math.abs(Math.cos(rotationRad))

    // Half-width and half-height of text bounding box
    const halfWidth = textWidth / 2
    const halfHeight = textHeight / 2

    // Maximum extension toward the line (perpendicular direction)
    // This is the distance from text center to edge in the perpendicular direction
    const maxExtension = halfWidth * sinRot + halfHeight * cosRot

    // Add padding to ensure no intersection
    additionalOffset =
      maxExtension + font_size * TEXT_INTERSECTION_PADDING_MULTIPLIER
  }

  const textOffset = arrowSize * TEXT_OFFSET_MULTIPLIER + additionalOffset
  const textPoint = {
    x: midPoint.x + perpendicular.x * textOffset,
    y: midPoint.y + perpendicular.y * textOffset,
  }

  const [textX, textY] = applyToPoint(transform, [textPoint.x, textPoint.y])

  const transformedFontSize = font_size * Math.abs(transform.a)

  const children: SvgObject[] = [
    ...extensionSegments,
    {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `M ${lineStartX} ${lineStartY} L ${lineEndX} ${lineEndY}`,
        stroke: lineColor,
        fill: "none",
        "stroke-width": strokeWidth.toString(),
        "stroke-linecap": "round",
        class: "pcb-fabrication-note-dimension-line",
      },
      children: [],
    },
    {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `${toPath(fromTriangle)} Z`,
        fill: lineColor,
        class: "pcb-fabrication-note-dimension-arrow",
      },
      children: [],
    },
    {
      name: "path",
      type: "element",
      value: "",
      attributes: {
        d: `${toPath(toTriangle)} Z`,
        fill: lineColor,
        class: "pcb-fabrication-note-dimension-arrow",
      },
      children: [],
    },
  ]

  if (text) {
    children.push({
      name: "text",
      type: "element",
      value: "",
      attributes: {
        x: textX.toString(),
        y: textY.toString(),
        fill: lineColor,
        "font-size": transformedFontSize.toString(),
        "font-family": "Arial, sans-serif",
        "text-anchor": "middle",
        "dominant-baseline": "central",
        class: "pcb-fabrication-note-dimension-text",
        transform: `rotate(${finalTextAngle} ${textX} ${textY})`,
      },
      children: [
        {
          type: "text",
          name: "",
          value: text,
          attributes: {},
          children: [],
        },
      ],
    })
  }

  const attributes: Record<string, string> = {
    class: "pcb-fabrication-note-dimension",
    "data-type": "pcb_fabrication_note_dimension",
    "data-pcb-fabrication-note-dimension-id": pcb_fabrication_note_dimension_id,
    "data-pcb-layer": layer ?? "overlay",
  }

  if (pcb_component_id !== undefined) {
    attributes["data-pcb-component-id"] = pcb_component_id
  }

  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes,
      children,
    },
  ]

  function toScreen(point: Point2D): Point2D {
    const [x, y] = applyToPoint(transform, [point.x, point.y])
    return { x, y }
  }
}
