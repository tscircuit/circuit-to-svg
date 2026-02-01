import type { Point, PcbCourtyardPolygon } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCourtyardPolygon(
  pcbCourtyardPolygon: PcbCourtyardPolygon,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    layer = "top",
    pcb_courtyard_polygon_id,
    points,
    color,
  } = pcbCourtyardPolygon

  if (layerFilter && layer !== layerFilter) return []

  if (!points || points.length === 0) {
    console.error(
      `[pcb_courtyard_polygon] Invalid data for "${pcb_courtyard_polygon_id}": expected non-empty array of points, got ${JSON.stringify(points)}`,
    )
    return []
  }

  const transformedPoints = points.map((p: Point) =>
    applyToPoint(transform, [p.x, p.y]),
  )
  const pointsString = transformedPoints.map((p) => `${p[0]},${p[1]}`).join(" ")

  const transformedStrokeWidth = 0.05 * Math.abs(transform.a)
  const strokeColor = color ?? colorMap.courtyard

  const attributes: { [key: string]: string } = {
    points: pointsString,
    class: `pcb-courtyard-polygon pcb-courtyard-${layer}`,
    "data-pcb-courtyard-polygon-id": pcb_courtyard_polygon_id,
    "data-type": "pcb_courtyard_polygon",
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
