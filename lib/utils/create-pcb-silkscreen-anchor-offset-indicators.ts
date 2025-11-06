import type { INode as SvgObject } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"

export interface PcbSilkscreenAnchorOffsetParams {
  anchorPosition: { x: number; y: number }
  renderedPosition: { x: number; y: number }
  transform: Matrix
  fontSize: number
}

interface HorizontalDimensionParams {
  startX: number
  endX: number
  y: number
  offsetMm: number
  offsetY: number
  scale: number
}

interface VerticalDimensionParams {
  x: number
  startY: number
  endY: number
  offsetMm: number
  offsetX: number
  offsetY: number
  scale: number
}

const OFFSET_THRESHOLD_MM = 0.01
const BASE_DIMENSION_OFFSET_PX = 20
const FONT_SIZE_MULTIPLIER = 20
const EXTRA_OFFSET_PX = 10
const MIN_DIMENSION_OFFSET_PX = 15
const CORNER_OFFSET_PX = 12
const TICK_SIZE_PX = 4
const LABEL_GAP_PX = 8
const LABEL_FONT_SIZE_PX = 11
const STROKE_WIDTH_PX = 1
const ANCHOR_MARKER_SIZE_PX = 5
const ANCHOR_MARKER_STROKE_WIDTH_PX = 1.5

export function createPcbSilkscreenAnchorOffsetIndicators(
  params: PcbSilkscreenAnchorOffsetParams,
): SvgObject[] {
  const { anchorPosition, renderedPosition, transform, fontSize } = params
  const objects: SvgObject[] = []

  const [screenAnchorX, screenAnchorY] = applyToPoint(transform, [
    anchorPosition.x,
    anchorPosition.y,
  ])
  const [screenRenderedX, screenRenderedY] = applyToPoint(transform, [
    renderedPosition.x,
    renderedPosition.y,
  ])

  const offsetX = renderedPosition.x - anchorPosition.x
  const offsetY = renderedPosition.y - anchorPosition.y

  const scale = Math.abs(transform.a)

  objects.push(createAnchorMarker(screenAnchorX, screenAnchorY, scale))

  const dimensionOffset =
    BASE_DIMENSION_OFFSET_PX + fontSize * FONT_SIZE_MULTIPLIER
  const verticalDirection =
    Math.abs(offsetY) < OFFSET_THRESHOLD_MM ? -1 : -Math.sign(offsetY)
  const extraOffset =
    Math.abs(offsetY) < OFFSET_THRESHOLD_MM ? EXTRA_OFFSET_PX : 0
  const actualDimensionOffset =
    Math.abs(offsetY) < OFFSET_THRESHOLD_MM
      ? MIN_DIMENSION_OFFSET_PX
      : dimensionOffset
  const offsetCornerY =
    screenRenderedY - verticalDirection * (actualDimensionOffset + extraOffset)
  const horizontalDirection =
    Math.abs(offsetX) > OFFSET_THRESHOLD_MM ? -Math.sign(offsetX) : 1
  const cornerX = screenAnchorX + horizontalDirection * CORNER_OFFSET_PX
  const cornerY = offsetCornerY

  if (Math.abs(offsetX) > OFFSET_THRESHOLD_MM) {
    objects.push(
      ...createHorizontalDimension({
        startX: screenAnchorX,
        endX: screenRenderedX,
        y: cornerY,
        offsetMm: offsetX,
        offsetY: offsetY,
        scale,
      }),
    )
  }

  if (Math.abs(offsetY) > OFFSET_THRESHOLD_MM) {
    const distanceToTextCenter = Math.abs(screenRenderedY - screenAnchorY)
    const directionMultiplier = Math.sign(offsetY)
    const lineEndY = screenAnchorY + directionMultiplier * distanceToTextCenter

    objects.push(
      ...createVerticalDimension({
        x: cornerX,
        startY: screenAnchorY,
        endY: lineEndY,
        offsetMm: -offsetY,
        offsetX: offsetX,
        offsetY: offsetY,
        scale,
      }),
    )
  }

  return objects
}

function createAnchorMarker(x: number, y: number, scale: number): SvgObject {
  return {
    name: "g",
    type: "element",
    attributes: {
      class: "anchor-offset-marker",
      "data-type": "anchor_offset_marker",
    },
    children: [
      {
        name: "line",
        type: "element",
        attributes: {
          x1: x.toString(),
          y1: (y - ANCHOR_MARKER_SIZE_PX).toString(),
          x2: x.toString(),
          y2: (y + ANCHOR_MARKER_SIZE_PX).toString(),
          stroke: "#ffffff",
          "stroke-width": ANCHOR_MARKER_STROKE_WIDTH_PX.toString(),
          "stroke-linecap": "round",
        },
        children: [],
        value: "",
      },
      {
        name: "line",
        type: "element",
        attributes: {
          x1: (x - ANCHOR_MARKER_SIZE_PX).toString(),
          y1: y.toString(),
          x2: (x + ANCHOR_MARKER_SIZE_PX).toString(),
          y2: y.toString(),
          stroke: "#ffffff",
          "stroke-width": ANCHOR_MARKER_STROKE_WIDTH_PX.toString(),
          "stroke-linecap": "round",
        },
        children: [],
        value: "",
      },
    ],
    value: "",
  }
}

function createHorizontalDimension({
  startX,
  endX,
  y,
  offsetMm,
  offsetY,
  scale,
}: HorizontalDimensionParams): SvgObject[] {
  const objects: SvgObject[] = []

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: startX.toString(),
      y1: y.toString(),
      x2: endX.toString(),
      y2: y.toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString(),
      class: "anchor-offset-dimension-x",
    },
    children: [],
    value: "",
  })

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: startX.toString(),
      y1: (y - TICK_SIZE_PX).toString(),
      x2: startX.toString(),
      y2: (y + TICK_SIZE_PX).toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString(),
    },
    children: [],
    value: "",
  })

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: endX.toString(),
      y1: (y - TICK_SIZE_PX).toString(),
      x2: endX.toString(),
      y2: (y + TICK_SIZE_PX).toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString(),
    },
    children: [],
    value: "",
  })

  const midX = (startX + endX) / 2
  const labelY =
    offsetY < 0
      ? y - TICK_SIZE_PX - LABEL_GAP_PX
      : y + TICK_SIZE_PX + LABEL_GAP_PX
  objects.push({
    name: "text",
    type: "element",
    attributes: {
      x: midX.toString(),
      y: labelY.toString(),
      fill: "#ffffff",
      "font-size": LABEL_FONT_SIZE_PX.toString(),
      "font-family": "Arial, sans-serif",
      "text-anchor": "middle",
      "dominant-baseline": offsetY < 0 ? "baseline" : "hanging",
      class: "anchor-offset-label",
    },
    children: [
      {
        type: "text",
        value: `X: ${offsetMm.toFixed(2)}mm`,
        name: "",
        attributes: {},
        children: [],
      },
    ],
    value: "",
  })

  return objects
}

function createVerticalDimension({
  x,
  startY,
  endY,
  offsetMm,
  offsetX,
  offsetY,
  scale,
}: VerticalDimensionParams): SvgObject[] {
  const objects: SvgObject[] = []

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: x.toString(),
      y1: startY.toString(),
      x2: x.toString(),
      y2: endY.toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString(),
      class: "anchor-offset-dimension-y",
    },
    children: [],
    value: "",
  })

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: (x - TICK_SIZE_PX).toString(),
      y1: startY.toString(),
      x2: (x + TICK_SIZE_PX).toString(),
      y2: startY.toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString(),
    },
    children: [],
    value: "",
  })

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: (x - TICK_SIZE_PX).toString(),
      y1: endY.toString(),
      x2: (x + TICK_SIZE_PX).toString(),
      y2: endY.toString(),
      stroke: "#ffffff",
      "stroke-width": STROKE_WIDTH_PX.toString(),
    },
    children: [],
    value: "",
  })

  const midY = (startY + endY) / 2
  const labelX = offsetX < 0 ? x + TICK_SIZE_PX + 4 : x - TICK_SIZE_PX - 4
  objects.push({
    name: "text",
    type: "element",
    attributes: {
      x: labelX.toString(),
      y: midY.toString(),
      fill: "#ffffff",
      "font-size": LABEL_FONT_SIZE_PX.toString(),
      "font-family": "Arial, sans-serif",
      "text-anchor": offsetX < 0 ? "start" : "end",
      "dominant-baseline": "middle",
      class: "anchor-offset-label",
    },
    children: [
      {
        type: "text",
        value: `Y: ${offsetMm.toFixed(2)}mm`,
        name: "",
        attributes: {},
        children: [],
      },
    ],
    value: "",
  })

  return objects
}
