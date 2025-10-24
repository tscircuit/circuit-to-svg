import type { PcbSilkscreenLine } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { toNumeric } from "../utils/to-numeric"

export function createSvgObjectsFromPcbSilkscreenLine(
  pcbSilkscreenLine: PcbSilkscreenLine,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
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

  const x1Value = toNumeric(x1)
  const y1Value = toNumeric(y1)
  const x2Value = toNumeric(x2)
  const y2Value = toNumeric(y2)
  const strokeWidthValue = toNumeric(stroke_width) ?? 0

  if (
    x1Value === undefined ||
    y1Value === undefined ||
    x2Value === undefined ||
    y2Value === undefined
  ) {
    console.error("Invalid coordinates:", { x1, y1, x2, y2 })
    return []
  }

  const [transformedX1, transformedY1] = applyToPoint(transform, [
    x1Value,
    y1Value,
  ])
  const [transformedX2, transformedY2] = applyToPoint(transform, [
    x2Value,
    y2Value,
  ])

  const transformedStrokeWidth = strokeWidthValue * Math.abs(transform.a)

  const color =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

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
        "data-type": "pcb_silkscreen_line",
        "data-pcb-layer": layer,
      },
      value: "",
      children: [],
    },
  ]
}
