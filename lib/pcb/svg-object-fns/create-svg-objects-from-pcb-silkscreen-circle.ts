import type { PcbSilkscreenCircle } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { toNumeric } from "../utils/to-numeric"

export function createSvgObjectsFromPcbSilkscreenCircle(
  pcbSilkscreenCircle: PcbSilkscreenCircle,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    center,
    radius,
    layer = "top",
    pcb_silkscreen_circle_id,
    stroke_width = 1,
  } = pcbSilkscreenCircle

  if (layerFilter && layer !== layerFilter) return []

  const centerX = toNumeric(center?.x)
  const centerY = toNumeric(center?.y)
  const radiusValue = toNumeric(radius)
  const strokeWidthValue = toNumeric(stroke_width) ?? 1

  if (
    centerX === undefined ||
    centerY === undefined ||
    radiusValue === undefined
  ) {
    console.error("Invalid PCB Silkscreen Circle data:", { center, radius })
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    centerX,
    centerY,
  ])

  const transformedRadius = radiusValue * Math.abs(transform.a)

  const transformedStrokeWidth = strokeWidthValue * Math.abs(transform.a)

  const color =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  const svgObject: SvgObject = {
    name: "circle",
    type: "element",
    attributes: {
      cx: transformedX.toString(),
      cy: transformedY.toString(),
      r: transformedRadius.toString(),
      class: `pcb-silkscreen-circle pcb-silkscreen-${layer}`,
      stroke: color,
      "stroke-width": transformedStrokeWidth.toString(),
      "data-pcb-silkscreen-circle-id": pcb_silkscreen_circle_id,
      "data-type": "pcb_silkscreen_circle",
      "data-pcb-layer": layer,
    },
    value: "",
    children: [],
  }

  return [svgObject]
}
