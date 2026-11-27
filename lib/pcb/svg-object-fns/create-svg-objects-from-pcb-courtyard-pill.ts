import type { PcbCourtyardPill } from "circuit-json"
import { debugPcb } from "lib/utils/debug"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCourtyardPill(
  pcbCourtyardPill: PcbCourtyardPill,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    center,
    width,
    height,
    radius,
    layer = "top",
    pcb_courtyard_pill_id,
    color: customColor,
  } = pcbCourtyardPill

  if (layerFilter && layer !== layerFilter) return []

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    typeof radius !== "number"
  ) {
    debugPcb(
      `[pcb_courtyard_pill] Invalid data for "${pcb_courtyard_pill_id}": expected center {x: number, y: number}, width: number, height: number, radius: number`,
    )
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])

  const transformedWidth = width * Math.abs(transform.a)
  const transformedHeight = height * Math.abs(transform.d)
  const clampedRadius = Math.min(Math.max(radius, 0), width / 2, height / 2)
  const transformedRadiusX = clampedRadius * Math.abs(transform.a)
  const transformedRadiusY = clampedRadius * Math.abs(transform.d)
  const transformedStrokeWidth = 0.05 * Math.abs(transform.a)

  const color =
    customColor ??
    (layer === "bottom" ? colorMap.courtyard.bottom : colorMap.courtyard.top)

  const svgObject: SvgObject = {
    name: "rect",
    type: "element",
    attributes: {
      x: (transformedX - transformedWidth / 2).toString(),
      y: (transformedY - transformedHeight / 2).toString(),
      width: transformedWidth.toString(),
      height: transformedHeight.toString(),
      rx: transformedRadiusX.toString(),
      ry: transformedRadiusY.toString(),
      fill: "none",
      stroke: color,
      "stroke-width": transformedStrokeWidth.toString(),
      class: `pcb-courtyard-pill pcb-courtyard-${layer}`,
      "data-pcb-courtyard-pill-id": pcb_courtyard_pill_id,
      "data-type": "pcb_courtyard_pill",
      "data-pcb-layer": layer,
    },
    value: "",
    children: [],
  }

  return [svgObject]
}
