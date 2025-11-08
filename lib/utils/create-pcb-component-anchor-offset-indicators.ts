import type { INode as SvgObject } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"

export interface PcbComponentAnchorOffsetParams {
  groupAnchorPosition: { x: number; y: number }
  componentPosition: { x: number; y: number }
  transform: Matrix
  componentWidth?: number
  componentHeight?: number
}

interface HorizontalDimensionParams {
  startX: number
  endX: number
  y: number
  offsetMm: number
  offsetY: number
}

interface VerticalDimensionParams {
  x: number
  startY: number
  endY: number
  offsetMm: number
  offsetX: number
}

const OFFSET_THRESHOLD_MM = 0.01
const TICK_SIZE_PX = 4
const LABEL_GAP_PX = 8
const LABEL_FONT_SIZE_PX = 11
const STROKE_WIDTH_PX = 1
const ANCHOR_MARKER_SIZE_PX = 5
const ANCHOR_MARKER_STROKE_WIDTH_PX = 1.5
const COMPONENT_GAP_PX = 15
const COMPONENT_SIDE_GAP_PX = 10
const DISTANCE_MULTIPLIER = 0.2
const MAX_OFFSET_PX = 50

export function createAnchorOffsetIndicators(
  params: PcbComponentAnchorOffsetParams,
): SvgObject[] {
  const {
    groupAnchorPosition,
    componentPosition,
    transform,
    componentWidth = 0,
    componentHeight = 0,
  } = params
  const objects: SvgObject[] = []

  const [screenGroupAnchorX, screenGroupAnchorY] = applyToPoint(transform, [
    groupAnchorPosition.x,
    groupAnchorPosition.y,
  ])
  const [screenComponentX, screenComponentY] = applyToPoint(transform, [
    componentPosition.x,
    componentPosition.y,
  ])

  const offsetX = componentPosition.x - groupAnchorPosition.x
  const offsetY = componentPosition.y - groupAnchorPosition.y

  const scale = Math.abs(transform.a)
  const screenComponentWidth = componentWidth * scale
  const screenComponentHeight = componentHeight * scale

  objects.push(createAnchorMarker(screenGroupAnchorX, screenGroupAnchorY))

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: screenGroupAnchorX.toString(),
      y1: screenGroupAnchorY.toString(),
      x2: screenComponentX.toString(),
      y2: screenComponentY.toString(),
      stroke: "#ffffff",
      "stroke-width": "0.5",
      "stroke-dasharray": "3,3",
      opacity: "0.5",
      class: "anchor-offset-connector",
    },
    children: [],
    value: "",
  })

  objects.push({
    name: "circle",
    type: "element",
    attributes: {
      cx: screenComponentX.toString(),
      cy: screenComponentY.toString(),
      r: "2",
      fill: "#ffffff",
      opacity: "0.7",
      class: "anchor-offset-component-marker",
    },
    children: [],
    value: "",
  })

  const yDistance = Math.abs(screenComponentY - screenGroupAnchorY)
  const xDistance = Math.abs(screenComponentX - screenGroupAnchorX)
  const totalDistance = Math.sqrt(xDistance * xDistance + yDistance * yDistance)

  const componentHeightOffset = screenComponentHeight / 2 + COMPONENT_GAP_PX
  const dynamicOffset = Math.max(
    componentHeightOffset,
    Math.min(MAX_OFFSET_PX, totalDistance * DISTANCE_MULTIPLIER),
  )

  const horizontalLineY =
    offsetY > 0
      ? screenComponentY - dynamicOffset
      : screenComponentY + dynamicOffset

  const componentWidthOffset = screenComponentWidth / 2 + COMPONENT_SIDE_GAP_PX
  const verticalLineX =
    offsetX > 0
      ? screenComponentX + componentWidthOffset
      : screenComponentX - componentWidthOffset

  if (Math.abs(offsetX) > OFFSET_THRESHOLD_MM) {
    objects.push(
      ...createHorizontalDimension({
        startX: screenGroupAnchorX,
        endX: screenComponentX,
        y: horizontalLineY,
        offsetMm: offsetX,
        offsetY: offsetY,
      }),
    )
  }

  if (Math.abs(offsetY) > OFFSET_THRESHOLD_MM) {
    objects.push(
      ...createVerticalDimension({
        x: verticalLineX,
        startY: screenGroupAnchorY,
        endY: screenComponentY,
        offsetMm: -offsetY,
        offsetX: offsetX,
      }),
    )
  }

  return objects
}

function createAnchorMarker(x: number, y: number): SvgObject {
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
    offsetY > 0
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
      "dominant-baseline": offsetY > 0 ? "baseline" : "hanging",
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
  const labelX = offsetX < 0 ? x - TICK_SIZE_PX - 4 : x + TICK_SIZE_PX + 4

  objects.push({
    name: "text",
    type: "element",
    attributes: {
      x: labelX.toString(),
      y: midY.toString(),
      fill: "#ffffff",
      "font-size": LABEL_FONT_SIZE_PX.toString(),
      "font-family": "Arial, sans-serif",
      "text-anchor": offsetX < 0 ? "end" : "start",
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
