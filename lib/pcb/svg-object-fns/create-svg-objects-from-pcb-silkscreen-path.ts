import type { PcbSilkscreenPath } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"

import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbSilkscreenPath(
  silkscreenPath: PcbSilkscreenPath,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  if (!silkscreenPath.route || !Array.isArray(silkscreenPath.route)) return []

  const validRoute = silkscreenPath.route.filter(
    (point: any) =>
      point &&
      typeof point.x === "number" &&
      Number.isFinite(point.x) &&
      typeof point.y === "number" &&
      Number.isFinite(point.y),
  )
  if (validRoute.length === 0) return []

  let path = validRoute
    .map((point: any, index: number) => {
      const [x, y] = applyToPoint(transform, [point.x, point.y])
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(" ")

  // Close the path if there are at least 3 points and the first and last points match
  const firstPoint = validRoute[0]
  const lastPoint = validRoute[validRoute.length - 1]
  if (
    validRoute.length > 2 &&
    firstPoint &&
    lastPoint &&
    firstPoint.x === lastPoint.x &&
    firstPoint.y === lastPoint.y
  ) {
    path += " Z"
  }

  const layer = silkscreenPath.layer || "top"
  if (layerFilter && layer !== layerFilter) return []
  const color =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top
  const strokeWidth =
    typeof silkscreenPath.stroke_width === "number" &&
    Number.isFinite(silkscreenPath.stroke_width)
      ? silkscreenPath.stroke_width
      : 0.1

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: `pcb-silkscreen pcb-silkscreen-${layer}`,
        d: path,
        fill: "none",
        stroke: color,
        "stroke-width": (strokeWidth * Math.abs(transform.a)).toString(),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "data-pcb-component-id": silkscreenPath.pcb_component_id,
        "data-pcb-silkscreen-path-id": silkscreenPath.pcb_silkscreen_path_id,
        "data-type": "pcb_silkscreen_path",
        "data-pcb-layer": layer,
      },
      value: "",
      children: [],
    },
  ]
}
