import type { PcbSilkscreenRect } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint, toString as matrixToString } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbSilkscreenRect(
  pcbSilkscreenRect: PcbSilkscreenRect,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    center,
    width,
    height,
    layer = "top",
    pcb_silkscreen_rect_id,
    stroke_width,
    is_filled,
    has_stroke,
    is_stroke_dashed,
    corner_radius,
  } = pcbSilkscreenRect

  if (layerFilter && layer !== layerFilter) return []

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    console.error("Invalid rectangle data:", { center, width, height })
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])
  const baseCornerRadius =
    typeof corner_radius === "number" && corner_radius > 0 ? corner_radius : 0
  const transformedCornerRadiusX = baseCornerRadius * Math.abs(transform.a)
  const transformedCornerRadiusY = baseCornerRadius * Math.abs(transform.d)

  const transformedWidth = width * Math.abs(transform.a)
  const transformedHeight = height * Math.abs(transform.d)

  const transformedStrokeWidth = stroke_width * Math.abs(transform.a)

  const color =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  const attributes: { [key: string]: string } = {
    x: (transformedX - transformedWidth / 2).toString(),
    y: (transformedY - transformedHeight / 2).toString(),
    width: transformedWidth.toString(),
    height: transformedHeight.toString(),
    class: `pcb-silkscreen-rect pcb-silkscreen-${layer}`,
    "data-pcb-silkscreen-rect-id": pcb_silkscreen_rect_id,
    "data-type": "pcb_silkscreen_rect",
    "data-pcb-layer": layer,
  }
  if (transformedCornerRadiusX > 0) {
    attributes.rx = transformedCornerRadiusX.toString()
  }

  if (transformedCornerRadiusY > 0) {
    attributes.ry = transformedCornerRadiusY.toString()
  }

  attributes.fill = is_filled ? color : "none"

  let actualHasStroke: boolean
  if (has_stroke === undefined) {
    actualHasStroke = transformedStrokeWidth > 0
  } else {
    actualHasStroke = has_stroke
  }

  if (actualHasStroke) {
    attributes.stroke = color
    attributes["stroke-width"] = transformedStrokeWidth.toString()
    if (is_stroke_dashed) {
      const dashLength = 0.1 * Math.abs(transform.a) // 0.1mm dash
      const gapLength = 0.05 * Math.abs(transform.a) // 0.05mm gap
      attributes["stroke-dasharray"] = `${dashLength} ${gapLength}`
    }
  } else {
    attributes.stroke = "none"
  }

  const svgObject: SvgObject = {
    name: "rect",
    type: "element",
    attributes,
    value: "",
    children: [],
  }

  return [svgObject]
}
