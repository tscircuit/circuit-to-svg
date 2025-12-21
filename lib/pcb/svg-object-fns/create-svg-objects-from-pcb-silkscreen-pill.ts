import type { PcbSilkscreenPill } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbSilkscreenPill(
  pcbSilkscreenPill: PcbSilkscreenPill,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    center,
    width,
    height,
    layer = "top",
    pcb_silkscreen_pill_id,
  } = pcbSilkscreenPill

  if (layerFilter && layer !== layerFilter) return []

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])

  const transformedWidth = width * Math.abs(transform.a)
  const transformedHeight = height * Math.abs(transform.d)

  // For a pill shape, the corner radius is half of the smaller dimension
  const minDimension = Math.min(width, height)
  const baseCornerRadius = minDimension / 2
  const transformedCornerRadiusX = baseCornerRadius * Math.abs(transform.a)
  const transformedCornerRadiusY = baseCornerRadius * Math.abs(transform.d)

  const color =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  const svgObject: SvgObject = {
    name: "rect",
    type: "element",
    attributes: {
      x: (transformedX - transformedWidth / 2).toString(),
      y: (transformedY - transformedHeight / 2).toString(),
      width: transformedWidth.toString(),
      height: transformedHeight.toString(),
      rx: transformedCornerRadiusX.toString(),
      ry: transformedCornerRadiusY.toString(),
      fill: "none",
      stroke: color,
      "stroke-width": (0.1 * Math.abs(transform.a)).toString(),
      class: `pcb-silkscreen-pill pcb-silkscreen-${layer}`,
      "data-pcb-silkscreen-pill-id": pcb_silkscreen_pill_id,
      "data-type": "pcb_silkscreen_pill",
      "data-pcb-layer": layer,
    },
    value: "",
    children: [],
  }

  return [svgObject]
}
