import type { PcbSilkscreenRect } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import {
  type Matrix,
  applyToPoint,
  toString as matrixToString,
} from "transformation-matrix"
import { SILKSCREEN_TOP_COLOR, SILKSCREEN_BOTTOM_COLOR } from "../colors"

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
    stroke_width = 1,
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

  const transformedStrokeWidth = stroke_width * Math.abs(transform.a)

  const color =
    layer === "bottom" ? SILKSCREEN_BOTTOM_COLOR : SILKSCREEN_TOP_COLOR

  const svgObject: SvgObject = {
    name: "rect",
    type: "element",
    attributes: {
      x: (transformedX - transformedWidth / 2).toString(),
      y: (transformedY - transformedHeight / 2).toString(),
      width: transformedWidth.toString(),
      height: transformedHeight.toString(),
      class: `pcb-silkscreen-rect pcb-silkscreen-${layer}`,
      fill: "none",
      stroke: color,
      "stroke-width": transformedStrokeWidth.toString(),
      "data-pcb-silkscreen-rect-id": pcb_silkscreen_rect_id,
    },
    value: "",
    children: [],
  }

  return [svgObject]
}
