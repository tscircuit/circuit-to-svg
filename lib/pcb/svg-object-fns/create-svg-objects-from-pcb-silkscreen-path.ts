import type { PcbSilkscreenPath } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"

import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { toNumeric } from "../utils/to-numeric"

export function createSvgObjectsFromPcbSilkscreenPath(
  silkscreenPath: PcbSilkscreenPath,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  if (!silkscreenPath.route || !Array.isArray(silkscreenPath.route)) return []

  const numericRoute = silkscreenPath.route
    .map((point: any) => {
      const x = toNumeric(point?.x)
      const y = toNumeric(point?.y)
      if (x === undefined || y === undefined) {
        return undefined
      }
      return { x, y }
    })
    .filter((point): point is { x: number; y: number } => point !== undefined)

  if (numericRoute.length === 0) {
    return []
  }

  const path = numericRoute
    .map((point, index) => {
      const [x, y] = applyToPoint(transform, [point.x, point.y])
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(" ")

  const firstPoint = numericRoute[0]
  const lastPoint = numericRoute[numericRoute.length - 1]

  if (!firstPoint || !lastPoint) {
    return []
  }

  const shouldClosePath =
    firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y

  const layer = silkscreenPath.layer || "top"
  if (layerFilter && layer !== layerFilter) return []
  const color =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  const strokeWidth = toNumeric(silkscreenPath.stroke_width) ?? 0
  const scaledStrokeWidth = strokeWidth * Math.abs(transform.a)

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: `pcb-silkscreen pcb-silkscreen-${layer}`,
        d: shouldClosePath ? `${path} Z` : path,
        fill: "none",
        stroke: color,
        "stroke-width": scaledStrokeWidth.toString(),
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
