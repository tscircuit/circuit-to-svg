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

const OFFSET_THRESHOLD = 0.01

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

  const baseDimensionOffset = 20
  const fontSizeMultiplier = 20
  const dimensionOffset = baseDimensionOffset + fontSize * fontSizeMultiplier
  const connectorGap = 10
  const verticalDirection =
    Math.abs(offsetY) < OFFSET_THRESHOLD ? -1 : -Math.sign(offsetY)
  const extraOffset = Math.abs(offsetY) < OFFSET_THRESHOLD ? 10 : 0
  const actualDimensionOffset =
    Math.abs(offsetY) < OFFSET_THRESHOLD ? 15 : dimensionOffset
  const offsetCornerY =
    screenRenderedY - verticalDirection * (actualDimensionOffset + extraOffset)
  const horizontalDirection =
    Math.abs(offsetX) > OFFSET_THRESHOLD ? -Math.sign(offsetX) : 1
  const cornerX = screenAnchorX + horizontalDirection * 12
  const cornerY = offsetCornerY

  if (Math.abs(offsetX) > OFFSET_THRESHOLD) {
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

  if (Math.abs(offsetY) > OFFSET_THRESHOLD) {
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
  const size = 5
  const strokeWidth = 1.5

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
          y1: (y - size).toString(),
          x2: x.toString(),
          y2: (y + size).toString(),
          stroke: "#ffffff",
          "stroke-width": strokeWidth.toString(),
          "stroke-linecap": "round",
        },
        children: [],
        value: "",
      },
      {
        name: "line",
        type: "element",
        attributes: {
          x1: (x - size).toString(),
          y1: y.toString(),
          x2: (x + size).toString(),
          y2: y.toString(),
          stroke: "#ffffff",
          "stroke-width": strokeWidth.toString(),
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
  const strokeWidth = 1
  const tickSize = 4
  const fontSize = 11

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: startX.toString(),
      y1: y.toString(),
      x2: endX.toString(),
      y2: y.toString(),
      stroke: "#ffffff",
      "stroke-width": strokeWidth.toString(),
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
      y1: (y - tickSize).toString(),
      x2: startX.toString(),
      y2: (y + tickSize).toString(),
      stroke: "#ffffff",
      "stroke-width": strokeWidth.toString(),
    },
    children: [],
    value: "",
  })

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: endX.toString(),
      y1: (y - tickSize).toString(),
      x2: endX.toString(),
      y2: (y + tickSize).toString(),
      stroke: "#ffffff",
      "stroke-width": strokeWidth.toString(),
    },
    children: [],
    value: "",
  })

  const midX = (startX + endX) / 2
  const labelGap = 8
  const labelY = offsetY < 0 ? y - tickSize - labelGap : y + tickSize + labelGap
  objects.push({
    name: "text",
    type: "element",
    attributes: {
      x: midX.toString(),
      y: labelY.toString(),
      fill: "#ffffff",
      "font-size": fontSize.toString(),
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
  const strokeWidth = 1
  const tickSize = 4
  const fontSize = 11

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: x.toString(),
      y1: startY.toString(),
      x2: x.toString(),
      y2: endY.toString(),
      stroke: "#ffffff",
      "stroke-width": strokeWidth.toString(),
      class: "anchor-offset-dimension-y",
    },
    children: [],
    value: "",
  })

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: (x - tickSize).toString(),
      y1: startY.toString(),
      x2: (x + tickSize).toString(),
      y2: startY.toString(),
      stroke: "#ffffff",
      "stroke-width": strokeWidth.toString(),
    },
    children: [],
    value: "",
  })

  objects.push({
    name: "line",
    type: "element",
    attributes: {
      x1: (x - tickSize).toString(),
      y1: endY.toString(),
      x2: (x + tickSize).toString(),
      y2: endY.toString(),
      stroke: "#ffffff",
      "stroke-width": strokeWidth.toString(),
    },
    children: [],
    value: "",
  })

  const midY = (startY + endY) / 2
  const labelX = offsetX < 0 ? x + tickSize + 4 : x - tickSize - 4
  objects.push({
    name: "text",
    type: "element",
    attributes: {
      x: labelX.toString(),
      y: midY.toString(),
      fill: "#ffffff",
      "font-size": fontSize.toString(),
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
