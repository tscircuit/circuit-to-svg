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
  const {
    center,
    width,
    height,
    layer = "top",
    pcb_silkscreen_rect_id,
  } = pcbSilkscreenRect

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    console.error("Invalid rectangle data:", { center, width, height })
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])

  const transformedWidth = width * Math.abs(transform.a)
  const transformedHeight = height * Math.abs(transform.d)

  const svgObject: SvgObject = {
    name: "rect",
    type: "element",
    attributes: {
      x: (transformedX - transformedWidth / 2).toString(),
      y: (transformedY - transformedHeight / 2).toString(),
      width: transformedWidth.toString(),
      height: transformedHeight.toString(),
      class: `pcb-silkscreen-rect pcb-silkscreen-${layer}`,
      stroke: "red",
      "stroke-width": "1",
      "data-pcb-silkscreen-rect-id": pcb_silkscreen_rect_id,
    },
    value: "",
    children: [],
  }

  return [svgObject]
}
