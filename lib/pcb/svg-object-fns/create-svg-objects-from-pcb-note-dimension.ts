import type { PcbNoteDimension } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { colorMap } from "lib/utils/colors"

interface Point2D {
  x: number
  y: number
}

function normalize(vector: Point2D): Point2D {
  const length = Math.hypot(vector.x, vector.y) || 1
  return { x: vector.x / length, y: vector.y / length }
}

function toPath(points: Point2D[]): string {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(" ")
}

export function createSvgObjectsFromPcbNoteDimension(
  dimension: PcbNoteDimension,
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx
  const {
    from,
    to,
    text,
    font_size = 1,
    color,
    arrow_size,
    offset_distance,
    offset_direction,
  } = dimension

  if (!from || !to) {
    console.error("Invalid pcb_note_dimension endpoints", { from, to })
    return []
  }

  if (!Number.isFinite(arrow_size) || arrow_size <= 0) {
    console.error("Invalid pcb_note_dimension arrow_size", arrow_size)
    return []
  }

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

  const arrowHalfWidth = arrow_size / 2

  const fromBase = {
    x: fromOffset.x + direction.x * arrow_size,
    y: fromOffset.y + direction.y * arrow_size,
  }

  const toBase = {
    x: toOffset.x - direction.x * arrow_size,
    y: toOffset.y - direction.y * arrow_size,
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

  const strokeWidth = (arrow_size / 5) * Math.abs(transform.a)
  const lineColor = color || colorMap.board.user_2

  const midPoint = {
    x: (from.x + to.x) / 2 + offsetVector.x,
    y: (from.y + to.y) / 2 + offsetVector.y,
  }

  const textOffset = arrow_size * 1.5
  const textPoint = {
    x: midPoint.x + perpendicular.x * textOffset,
    y: midPoint.y + perpendicular.y * textOffset,
  }

  const [textX, textY] = applyToPoint(transform, [textPoint.x, textPoint.y])
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

  const transformedFontSize = font_size * Math.abs(transform.a)

  const children: SvgObject[] = [
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
        class: "pcb-note-dimension-line",
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
        class: "pcb-note-dimension-arrow",
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
        class: "pcb-note-dimension-arrow",
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
        class: "pcb-note-dimension-text",
        transform: `rotate(${textAngle} ${textX} ${textY})`,
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

  return [
    {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "pcb-note-dimension",
        "data-type": "pcb_note_dimension",
        "data-pcb-note-dimension-id": dimension.pcb_note_dimension_id,
        "data-pcb-layer": "overlay",
      },
      children,
    },
  ]

  function toScreen(point: Point2D): Point2D {
    const [x, y] = applyToPoint(transform, [point.x, point.y])
    return { x, y }
  }
}
