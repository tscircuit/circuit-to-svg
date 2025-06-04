import type { PcbSilkscreenCircle } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint, toString as matrixToString } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

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

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof radius !== "number"
  ) {
    console.error("Invalid PCB Silkscreen Circle data:", { center, radius })
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])

  const transformedRadius = radius * Math.abs(transform.a)

  const transformedStrokeWidth = stroke_width * Math.abs(transform.a)

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
    },
    value: "",
    children: [],
  }

  return [svgObject]
}
