import type { PcbCourtyardCircle } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCourtyardCircle(
  pcbCourtyardCircle: PcbCourtyardCircle,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    center,
    radius,
    layer = "top",
    pcb_courtyard_circle_id,
  } = pcbCourtyardCircle

  if (layerFilter && layer !== layerFilter) return []

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof radius !== "number"
  ) {
    console.error(
      `[pcb_courtyard_circle] Invalid data for "${pcb_courtyard_circle_id}": expected center {x: number, y: number}, radius: number, got center=${JSON.stringify(center)}, radius=${JSON.stringify(radius)}`,
    )
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])

  const transformedRadius = radius * Math.abs(transform.a)
  const transformedStrokeWidth = 0.05 * Math.abs(transform.a)

  const color =
    layer === "bottom" ? colorMap.courtyard.bottom : colorMap.courtyard.top

  const attributes: { [key: string]: string } = {
    cx: transformedX.toString(),
    cy: transformedY.toString(),
    r: transformedRadius.toString(),
    class: `pcb-courtyard-circle pcb-courtyard-${layer}`,
    "data-pcb-courtyard-circle-id": pcb_courtyard_circle_id,
    "data-type": "pcb_courtyard_circle",
    "data-pcb-layer": layer,
  }

  attributes.fill = "none"
  attributes.stroke = color
  attributes["stroke-width"] = transformedStrokeWidth.toString()

  const svgObject: SvgObject = {
    name: "circle",
    type: "element",
    attributes,
    value: "",
    children: [],
  }

  return [svgObject]
}
