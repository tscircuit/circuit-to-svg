import type { PcbSilkscreenLine } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint, toString as matrixToString } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { SILKSCREEN_TOP_COLOR, SILKSCREEN_BOTTOM_COLOR } from "../colors"

export function createSvgObjectsFromPcbSilkscreenLine(
  pcbSilkscreenLine: PcbSilkscreenLine,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter } = ctx
  const {
    x1,
    y1,
    x2,
    y2,
    stroke_width,
    layer = "top",
    pcb_silkscreen_line_id,
  } = pcbSilkscreenLine

  if (layerFilter && layer !== layerFilter) return []

  if (
    typeof x1 !== "number" ||
    typeof y1 !== "number" ||
    typeof x2 !== "number" ||
    typeof y2 !== "number"
  ) {
    console.error("Invalid coordinates:", { x1, y1, x2, y2 })
    return []
  }

  const [transformedX1, transformedY1] = applyToPoint(transform, [x1, y1])
  const [transformedX2, transformedY2] = applyToPoint(transform, [x2, y2])

  const transformedStrokeWidth = stroke_width * Math.abs(transform.a)

  const color =
    layer === "bottom" ? SILKSCREEN_BOTTOM_COLOR : SILKSCREEN_TOP_COLOR

  return [
    {
      name: "line",
      type: "element",
      attributes: {
        x1: transformedX1.toString(),
        y1: transformedY1.toString(),
        x2: transformedX2.toString(),
        y2: transformedY2.toString(),
        stroke: color,
        "stroke-width": transformedStrokeWidth.toString(),
        class: `pcb-silkscreen-line pcb-silkscreen-${layer}`,
        "data-pcb-silkscreen-line-id": pcb_silkscreen_line_id,
      },
      value: "",
      children: [],
    },
  ]
}
