import type { PCBBoard, Point } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { toNumeric } from "../utils/to-numeric"

export function createSvgObjectsFromPcbBoard(
  pcbBoard: PCBBoard,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap } = ctx
  const { width, height, center, outline } = pcbBoard

  const widthValue = toNumeric(width) ?? 0
  const heightValue = toNumeric(height) ?? 0
  const centerX = toNumeric(center?.x) ?? 0
  const centerY = toNumeric(center?.y) ?? 0

  let path: string
  if (outline && Array.isArray(outline) && outline.length >= 3) {
    path = outline
      .map((point: Point, index: number) => {
        const pointX = toNumeric(point.x) ?? 0
        const pointY = toNumeric(point.y) ?? 0
        const [x, y] = applyToPoint(transform, [pointX, pointY])
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(" ")
  } else {
    const halfWidth = widthValue / 2
    const halfHeight = heightValue / 2

    const topLeft = applyToPoint(transform, [
      centerX - halfWidth,
      centerY - halfHeight,
    ])
    const topRight = applyToPoint(transform, [
      centerX + halfWidth,
      centerY - halfHeight,
    ])
    const bottomRight = applyToPoint(transform, [
      centerX + halfWidth,
      centerY + halfHeight,
    ])
    const bottomLeft = applyToPoint(transform, [
      centerX - halfWidth,
      centerY + halfHeight,
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
        stroke: colorMap.boardOutline,
        "stroke-width": (0.1 * Math.abs(transform.a)).toString(),
        "data-type": "pcb_board",
        "data-pcb-layer": "board",
      },
    },
  ]
}
