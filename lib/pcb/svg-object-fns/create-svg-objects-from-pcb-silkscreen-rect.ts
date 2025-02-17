import type { PcbSilkscreenRect } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import {
  type Matrix,
  applyToPoint,
  toString as matrixToString,
} from "transformation-matrix"

export function createSvgObjectsFromPcbSilkscreenRect(
  pcbSilkscreenRect: PcbSilkscreenRect,
  transform: Matrix,
): SvgObject[] {
  const { center, width, height, layer } = pcbSilkscreenRect

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])
  const transformedWidth = width * Math.abs(transform.a)
  const transformedHeight = height * Math.abs(transform.d)

  return [
    {
      name: "rect",
      type: "element",
      attributes: {
        x: (transformedX - transformedWidth / 2).toString(),
        y: (transformedY - transformedHeight / 2).toString(),
        width: transformedWidth.toString(),
        height: transformedHeight.toString(),
        class: `pcb-silkscreen-rect pcb-silkscreen-${layer}`,
        transform: matrixToString(transform),
        "data-pcb-silkscreen-rect-id": pcbSilkscreenRect.pcb_silkscreen_rect_id,
      },
      value: "",
      children: [],
    },
  ]
}
