import type { INode as SvgObject } from "svgson"
import { applyToPoint, type Matrix } from "transformation-matrix"

export interface PcbSilkscreenAnchorOffsetParams {
  anchorPosition: { x: number; y: number }
  renderedPosition: { x: number; y: number }
  transform: Matrix
}

const OFFSET_THRESHOLD = 0.01 // mm

export function createPcbSilkscreenAnchorOffsetIndicators(
  params: PcbSilkscreenAnchorOffsetParams,
): SvgObject[] {
  const { anchorPosition, renderedPosition, transform } = params
  const objects: SvgObject[] = []

  // Transform positions to screen coordinates
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

  // Always show the anchor marker
  objects.push(createAnchorMarker(screenAnchorX, screenAnchorY, scale))

  // Offset for dimension lines from text to avoid overlap
  const dimensionOffset = 20 // pixels to offset dimension lines

  // Create L-shaped dimension lines
  // Offset the entire L-shape away from the text
  // SUBTRACT to move up in screen coordinates (Y increases downward)
  const offsetCornerY = screenRenderedY - Math.sign(offsetY) * dimensionOffset
  const cornerX = screenAnchorX
  const cornerY = offsetCornerY

  // Horizontal dimension line: offset in Y direction
  if (Math.abs(offsetX) > OFFSET_THRESHOLD) {
    // Connector from anchor to where horizontal dimension line is
    objects.push({
      name: "line",
      type: "element",
      attributes: {
        x1: screenAnchorX.toString(),
        y1: screenAnchorY.toString(),
        x2: screenAnchorX.toString(),
        y2: cornerY.toString(),
        stroke: "#ffffff",
        "stroke-width": "0.5",
        "stroke-dasharray": "2,2",
        class: "anchor-offset-connector",
      },
      children: [],
      value: "",
    })

    objects.push(
      ...createHorizontalDimension({
        startX: screenAnchorX,
        endX: screenRenderedX,
        y: cornerY,
        offsetMm: offsetX,
        scale,
      }),
    )
  }

  // Vertical dimension line: at anchor X position, offset in Y
  if (Math.abs(offsetY) > OFFSET_THRESHOLD) {
    // Calculate offset anchor Y position
    const offsetAnchorY = screenAnchorY - Math.sign(offsetY) * dimensionOffset
    
    // Connector from rendered position to the horizontal dimension line
    objects.push({
      name: "line",
      type: "element",
      attributes: {
        x1: screenRenderedX.toString(),
        y1: screenRenderedY.toString(),
        x2: screenRenderedX.toString(),
        y2: cornerY.toString(),
        stroke: "#ffffff",
        "stroke-width": "0.5",
        "stroke-dasharray": "2,2",
        class: "anchor-offset-connector",
      },
      children: [],
      value: "",
    })

    objects.push(
      ...createVerticalDimension({
        x: cornerX,
        startY: offsetAnchorY,
        endY: cornerY,
        offsetMm: offsetY,
        scale,
      }),
    )
  }

  return objects
}

function createAnchorMarker(
  x: number,
  y: number,
  scale: number,
): SvgObject {
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

interface HorizontalDimensionParams {
  startX: number
  endX: number
  y: number
  offsetMm: number
  scale: number
}

function createHorizontalDimension(
  params: HorizontalDimensionParams,
): SvgObject[] {
  const { startX, endX, y, offsetMm, scale } = params
  const objects: SvgObject[] = []
  const strokeWidth = 1
  const tickSize = 4
  const fontSize = 11

  // Main horizontal line
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

  // Start tick
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

  // End tick
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

  // Text label - positioned further above the line
  const midX = (startX + endX) / 2
  objects.push({
    name: "text",
    type: "element",
    attributes: {
      x: midX.toString(),
      y: (y - tickSize - 8).toString(),
      fill: "#ffffff",
      "font-size": fontSize.toString(),
      "font-family": "Arial, sans-serif",
      "text-anchor": "middle",
      "dominant-baseline": "baseline",
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

interface VerticalDimensionParams {
  x: number
  startY: number
  endY: number
  offsetMm: number
  scale: number
}

function createVerticalDimension(
  params: VerticalDimensionParams,
): SvgObject[] {
  const { x, startY, endY, offsetMm, scale } = params
  const objects: SvgObject[] = []
  const strokeWidth = 1
  const tickSize = 4
  const fontSize = 11

  // Main vertical line
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

  // Start tick
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

  // End tick
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

  // Text label - positioned further to the left of the line
  const midY = (startY + endY) / 2
  objects.push({
    name: "text",
    type: "element",
    attributes: {
      x: (x - tickSize - 8).toString(),
      y: midY.toString(),
      fill: "#ffffff",
      "font-size": fontSize.toString(),
      "font-family": "Arial, sans-serif",
      "text-anchor": "end",
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
