import type { PcbCourtyardOutline, Point } from "circuit-json"
import { debugPcb } from "lib/utils/debug"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCourtyardOutline(
  pcbCourtyardOutline: PcbCourtyardOutline,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const { layer, pcb_courtyard_outline_id, outline } = pcbCourtyardOutline

  if (layerFilter && layer !== layerFilter) return []

  if (!outline || outline.length === 0) {
    debugPcb(
      `[pcb_courtyard_outline] Invalid data for "${pcb_courtyard_outline_id}": expected non-empty array of points, got ${JSON.stringify(outline)}`,
    )
    return []
  }

  const transformedPoints = outline.map((p: Point) =>
    applyToPoint(transform, [p.x, p.y]),
  )
  const pointsString = transformedPoints.map((p) => `${p[0]},${p[1]}`).join(" ")

  const transformedStrokeWidth = 0.05 * Math.abs(transform.a)

  const strokeColor =
    layer === "bottom" ? colorMap.courtyard.bottom : colorMap.courtyard.top

  const attributes: { [key: string]: string } = {
    points: pointsString,
    class: `pcb-courtyard-outline pcb-courtyard-${layer}`,
    "data-pcb-courtyard-outline-id": pcb_courtyard_outline_id,
    "data-type": "pcb_courtyard_outline",
    "data-pcb-layer": layer,
    fill: "none",
    stroke: strokeColor,
    "stroke-width": transformedStrokeWidth.toString(),
  }

  const svgObject: SvgObject = {
    name: "polygon",
    type: "element",
    attributes,
    value: "",
    children: [],
  }

  return [svgObject]
}
