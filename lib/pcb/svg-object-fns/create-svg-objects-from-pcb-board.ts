import type { PCBBoard, Point } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../pcb-context"

export function createSvgObjectsFromPcbBoard({
  pcbBoard,
  ctx,
}: {
  pcbBoard: PCBBoard
  ctx: PcbContext
}): SvgObject[] {
  const { transform } = ctx
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
        fill: "none",
        stroke: "rgba(255, 255, 255, 0.5)",
        "stroke-width": (0.1 * Math.abs(transform.a)).toString(),
      },
    },
  ]
}
