import type { Point } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { type Matrix, applyToPoint } from "transformation-matrix"
import { getSchScreenFontSize } from "lib/utils/get-sch-font-size"
interface ComponentProps {
  center: Point
  width: number
  height: number
  rotation?: number
}

export function createSvgObjectsFromAssemblyComponent(
  component: ComponentProps,
  transform: Matrix,
  firstPin: Point,
  name?: string,
): SvgObject {
  const { center, width, height, rotation = 0 } = component
  const [x, y] = applyToPoint(transform, [center.x, center.y])
  const [pinX, pinY] = applyToPoint(transform, [firstPin.x, firstPin.y])
  const scaledWidth = width * Math.abs(transform.a)
  const scaledHeight = height * Math.abs(transform.d)

  return {
    name: "g",
    type: "element",
    value: "",
    attributes: {
      transform: `translate(${x}, ${y}) rotate(${-rotation}) scale(1, -1)`,
    },
    children: [
      createComponentPath(
        scaledWidth,
        scaledHeight,
        x,
        y,
        pinX,
        pinY,
        rotation,
      ),
      createComponentLabel(scaledWidth, scaledHeight, name ?? "", transform),
    ],
  }
}

function createComponentPath(
  scaledWidth: number,
  scaledHeight: number,
  centerX: number,
  centerY: number,
  pinX: number,
  pinY: number,
  rotation: number,
): SvgObject {
  const w = scaledWidth / 2
  const h = scaledHeight / 2
  const cornerSize = Math.min(w, h) * 0.3
  const isTop = pinY > centerY
  const isLeft = pinX < centerX

  const path = getComponentPathData(w, h, cornerSize, isTop, isLeft, rotation)
  return {
    name: "path",
    type: "element",
    attributes: {
      class: "assembly-component",
      d: path,
    },
    value: "",
    children: [],
  }
}

function createComponentLabel(
  scaledWidth: number,
  scaledHeight: number,
  name: string,
  transform: Matrix,
): SvgObject {
  const scale = Math.min(scaledWidth, scaledHeight) * 0.4
  const fontSize = getSchScreenFontSize(transform, "net_label") * (scale / 2.5)
  const scaledFontSize = scale < 25 ? fontSize : fontSize * 0.6
  return {
    name: "text",
    type: "element",
    attributes: {
      x: "0",
      y: `${0 + scaledFontSize / 8}`,
      class: "assembly-component-label",
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-size": `${scaledFontSize}px`,
      transform: "scale(1, -1)",
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

function getComponentPathData(
  w: number,
  h: number,
  cornerSize: number,
  isTop: boolean,
  isLeft: boolean,
  rotation: number,
): string {
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

  let corners: [number, number][]
  if (isTop && isLeft) {
    // Top-left corner
    corners = [
      [-w, -h + cornerSize],
      [-w + cornerSize, -h],
      [w, -h],
      [w, h],
      [-w, h],
    ]
  } else if (isTop && !isLeft) {
    // Top-right corner
    corners = [
      [-w, -h],
      [w - cornerSize, -h],
      [w, -h + cornerSize],
      [w, h],
      [-w, h],
    ]
  } else if (!isTop && isLeft) {
    // Bottom-left corner
    corners = [
      [-w, -h],
      [w, -h],
      [w, h],
      [-w + cornerSize, h],
      [-w, h - cornerSize],
    ]
  } else {
    // Bottom-right corner
    corners = [
      [-w, -h],
      [w, -h],
      [w, h - cornerSize],
      [w - cornerSize, h],
      [-w, h],
    ]
  }

  const rotatedCorners = corners.map(([x, y]) => rotatePoint(x, y, rotation))

  const path = rotatedCorners
    .map(([x, y], index) => (index === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(" ")
  return `${path} Z`
}
