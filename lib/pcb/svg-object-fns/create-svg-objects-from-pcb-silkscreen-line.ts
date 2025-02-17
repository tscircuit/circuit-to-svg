import type { PcbSilkscreenLine } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import {
  type Matrix,
  applyToPoint,
  toString as matrixToString,
} from "transformation-matrix"

export function createSvgObjectsFromPcbSilkscreenLine(
  pcbSilkscreenLine: PcbSilkscreenLine,
  transform: Matrix,
): SvgObject[] {
  const { x1, y1, x2, y2, stroke_width, layer } = pcbSilkscreenLine

  const [transformedX1, transformedY1] = applyToPoint(transform, [x1, y1])
  const [transformedX2, transformedY2] = applyToPoint(transform, [x2, y2])
  const transformedStrokeWidth = stroke_width * Math.abs(transform.a)

  return [
    {
      name: "line",
      type: "element",
      attributes: {
        x1: transformedX1.toString(),
        y1: transformedY1.toString(),
        x2: transformedX2.toString(),
        y2: transformedY2.toString(),
        "stroke-width": transformedStrokeWidth.toString(),
        class: `pcb-silkscreen-line pcb-silkscreen-${layer}`,
        transform: matrixToString(transform),
        "data-pcb-silkscreen-line-id": pcbSilkscreenLine.pcb_silkscreen_line_id,
      },
      value: "",
      children: [],
    },
  ]
}
