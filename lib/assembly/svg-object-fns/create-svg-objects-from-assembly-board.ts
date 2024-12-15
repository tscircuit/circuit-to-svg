import type { PCBBoard, Point } from "circuit-json"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"

interface BoardStyle {
  fill: string
  stroke: string
  strokeOpacity: string
  strokeWidthFactor: number
}

const DEFAULT_BOARD_STYLE: BoardStyle = {
  fill: "none",
  stroke: "rgb(0,0,0)",
  strokeOpacity: "0.8",
  strokeWidthFactor: 0.2,
}

export function createSvgObjectsFromAssemblyBoard(
  pcbBoard: PCBBoard,
  transform: Matrix,
  style: Partial<BoardStyle> = {},
): SvgObject[] {
  const { width, height, center, outline } = pcbBoard

  let path: string
  if (outline && Array.isArray(outline) && outline.length >= 3) {
    path = outline
      .map((point: Point, index: number) => {
        const [x, y] = applyToPoint(transform, [point.x, point.y])
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(" ")
  } else {
    const halfWidth = width / 2
    const halfHeight = height / 2

    const topLeft = applyToPoint(transform, [
      center.x - halfWidth,
      center.y - halfHeight,
    ])
    const topRight = applyToPoint(transform, [
      center.x + halfWidth,
      center.y - halfHeight,
    ])
    const bottomRight = applyToPoint(transform, [
      center.x + halfWidth,
      center.y + halfHeight,
    ])
    const bottomLeft = applyToPoint(transform, [
      center.x - halfWidth,
      center.y + halfHeight,
    ])

    path =
      `M ${topLeft[0]} ${topLeft[1]} ` +
      `L ${topRight[0]} ${topRight[1]} ` +
      `L ${bottomRight[0]} ${bottomRight[1]} ` +
      `L ${bottomLeft[0]} ${bottomLeft[1]}`
  }

  path += " Z"

  return [
    {
      name: "path",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-board",
        d: path,
        fill: style.fill ?? DEFAULT_BOARD_STYLE.fill,
        stroke: style.stroke ?? DEFAULT_BOARD_STYLE.stroke,
        "stroke-opacity":
          style.strokeOpacity ?? DEFAULT_BOARD_STYLE.strokeOpacity,
        "stroke-width": (
          (style.strokeWidthFactor ?? DEFAULT_BOARD_STYLE.strokeWidthFactor) *
          Math.abs(transform.a)
        ).toString(),
      },
    },
  ]
}
