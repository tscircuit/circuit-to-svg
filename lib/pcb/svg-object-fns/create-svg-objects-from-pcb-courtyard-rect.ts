import type { PcbCourtyardRect } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCourtyardRect(
  pcbCourtyardRect: PcbCourtyardRect,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    center,
    width,
    height,
    layer = "top",
    pcb_courtyard_rect_id,
  } = pcbCourtyardRect

  if (layerFilter && layer !== layerFilter) return []

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    console.error("Invalid courtyard rectangle data:", {
      center,
      width,
      height,
    })
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])

  const transformedWidth = width * Math.abs(transform.a)
  const transformedHeight = height * Math.abs(transform.d)
  const transformedStrokeWidth = 0.05 * Math.abs(transform.a)

  const color = colorMap.courtyard

  const attributes: { [key: string]: string } = {
    x: (transformedX - transformedWidth / 2).toString(),
    y: (transformedY - transformedHeight / 2).toString(),
    width: transformedWidth.toString(),
    height: transformedHeight.toString(),
    class: `pcb-courtyard-rect pcb-courtyard-${layer}`,
    "data-pcb-courtyard-rect-id": pcb_courtyard_rect_id,
    "data-type": "pcb_courtyard_rect",
    "data-pcb-layer": layer,
  }

  attributes.fill = "none"
  attributes.stroke = color
  attributes["stroke-width"] = transformedStrokeWidth.toString()

  const svgObject: SvgObject = {
    name: "rect",
    type: "element",
    attributes,
    value: "",
    children: [],
  }

  return [svgObject]
}
