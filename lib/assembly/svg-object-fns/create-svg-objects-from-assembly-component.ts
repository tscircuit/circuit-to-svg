import type {
  PcbComponent,
  LayerRef,
  Point,
  AnyCircuitElement,
} from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { AssemblySvgContext } from "../convert-circuit-json-to-assembly-svg"

export interface AssemblyComponentParams {
  elm: AnyCircuitElement
  portPosition: { x: number; y: number }
  name: string
  arePinsInterchangeable?: boolean
}

interface ComponentProps {
  center: Point
  width: number
  height: number
  rotation?: number
  layer?: LayerRef
}

export function createSvgObjectsFromAssemblyComponent(
  params: AssemblyComponentParams,
  ctx: AssemblySvgContext,
): SvgObject | null {
  const { elm, portPosition, name, arePinsInterchangeable } = params
  const { transform } = ctx
  const { center, width, height, rotation = 0, layer = "top" } = elm as any
  if (!center || typeof width !== "number" || typeof height !== "number")
    return null
  const [x, y] = applyToPoint(transform, [center.x, center.y])
  const [pinX, pinY] = applyToPoint(transform, [portPosition.x, portPosition.y])
  const scaledWidth = width * Math.abs(transform.a)
  const scaledHeight = height * Math.abs(transform.d)

  const isTopLayer = layer === "top"
  const isPinTop = pinY > y
  const isPinLeft = pinX < x

  const children: SvgObject[] = [
    createComponentPath(scaledWidth, scaledHeight, rotation, layer),
    createComponentLabel(scaledWidth, scaledHeight, name ?? ""),
  ]

  if (!arePinsInterchangeable) {
    children.push(
      createPin1Indicator(
        scaledWidth,
        scaledHeight,
        rotation,
        layer,
        isPinTop,
        isPinLeft,
      ),
    )
  }

  return {
    name: "g",
    type: "element",
    value: "",
    attributes: {
      transform: `translate(${x}, ${y}) scale(1, -1)`,
    },
    children,
  }
}

function createComponentPath(
  scaledWidth: number,
  scaledHeight: number,
  rotation: number,
  layer: LayerRef,
): SvgObject {
  const w = scaledWidth / 2
  const h = scaledHeight / 2
  const strokeWidth = 0.8
  const path = getRectPathData(w, h, rotation)

  return {
    name: "path",
    type: "element",
    attributes: {
      class: "assembly-component",
      d: path,
      "stroke-width": strokeWidth.toFixed(2),
      transform: `rotate(${-rotation})`,
      "stroke-dasharray": layer === "bottom" ? "2,2" : "",
    },
    value: "",
    children: [],
  }
}

function createComponentLabel(
  scaledWidth: number,
  scaledHeight: number,
  name: string,
): SvgObject {
  const minFontSize = 3
  const maxFontSize = 58
  const averageCharacterWidthRatio = 0.65
  const isTall = scaledHeight > scaledWidth
  const availableLabelLength =
    (isTall ? scaledHeight : scaledWidth) * 0.85
  const availableLabelHeight =
    (isTall ? scaledWidth : scaledHeight) * 0.8
  const characterCount = Math.max(name.length, 1)
  const fontSizeForLabelLength =
    availableLabelLength / (characterCount * averageCharacterWidthRatio)
  const fontSize = Math.min(
    maxFontSize,
    Math.max(
      minFontSize,
      Math.min(availableLabelHeight, fontSizeForLabelLength),
    ),
  )

  return {
    name: "text",
    type: "element",
    attributes: {
      x: "0",
      y: "0",
      class: "assembly-component-label",
      "text-anchor": "middle",
      dy: ".10em",
      style: "pointer-events: none",
      "font-size": `${fontSize.toFixed(1)}px`,
      transform: isTall ? "rotate(90) scale(1, -1)" : "scale(1, -1)",
    },
    children: [
      {
        type: "text",
        value: name || "",
        name: "",
        attributes: {},
        children: [],
      },
    ],
    value: "",
  }
}

function createPin1Indicator(
  scaledWidth: number,
  scaledHeight: number,
  rotation: number,
  layer: LayerRef,
  isPinTop: boolean,
  isPinLeft: boolean,
): SvgObject {
  const w = scaledWidth / 2
  const h = scaledHeight / 2
  const indicatorSize = Math.min(w, h) * 0.5

  let points: [number, number][]

  if (isPinTop && isPinLeft) {
    // Top-left corner
    points = [
      [-w, -h], // Corner point
      [-w + indicatorSize, -h], // Point along top edge
      [-w, -h + indicatorSize], // Point along left edge
    ]
  } else if (isPinTop && !isPinLeft) {
    // Top-right corner
    points = [
      [w, -h], // Corner point
      [w - indicatorSize, -h], // Point along top edge
      [w, -h + indicatorSize], // Point along right edge
    ]
  } else if (!isPinTop && isPinLeft) {
    // Bottom-left corner
    points = [
      [-w, h], // Corner point
      [-w + indicatorSize, h], // Point along bottom edge
      [-w, h - indicatorSize], // Point along left edge
    ]
  } else {
    // Bottom-right corner
    points = [
      [w, h], // Corner point
      [w - indicatorSize, h], // Point along bottom edge
      [w, h - indicatorSize], // Point along right edge
    ]
  }

  const pointsString = points.map((p) => p.join(",")).join(" ")

  return {
    name: "polygon",
    type: "element",
    attributes: {
      class: "assembly-pin1-indicator",
      points: pointsString,
      fill: "#333",
      stroke: "none",
      transform: `rotate(${-rotation})`,
    },
    value: "",
    children: [],
  }
}

function getRectPathData(w: number, h: number, rotation: number): string {
  const rotatePoint = (
    x: number,
    y: number,
    angle: number,
  ): [number, number] => {
    const rad = (Math.PI / 180) * angle
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return [x * cos - y * sin, x * sin + y * cos]
  }

  const corners: [number, number][] = [
    [-w, -h],
    [w, -h],
    [w, h],
    [-w, h],
  ]

  const rotatedCorners = corners.map(([x, y]) => rotatePoint(x, y, rotation))

  const path = rotatedCorners
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(" ")
  return `${path} Z`
}
