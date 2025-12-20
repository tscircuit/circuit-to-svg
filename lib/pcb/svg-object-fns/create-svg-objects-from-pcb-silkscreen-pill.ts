import type { PcbSilkscreenPill } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { distance } from "circuit-json"

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

  // Parse width and height if they're Length types (string) or use as numbers
  const numericWidth =
    distance.parse(width) ?? (typeof width === "number" ? width : 0)
  const numericHeight =
    distance.parse(height) ?? (typeof height === "number" ? height : 0)

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    numericWidth <= 0 ||
    numericHeight <= 0
  ) {
    console.error("Invalid PCB Silkscreen Pill data:", {
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

  const transformedWidth = numericWidth * Math.abs(transform.a)
  const transformedHeight = numericHeight * Math.abs(transform.d)

  // For a pill shape, the corner radius is half of the smaller dimension
  const minDimension = Math.min(numericWidth, numericHeight)
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
