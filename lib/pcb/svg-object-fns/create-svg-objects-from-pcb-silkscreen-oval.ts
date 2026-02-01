import type { PcbSilkscreenOval } from "circuit-json"
import { debugPcb } from "lib/utils/debug"
import type { INode as SvgObject } from "svgson"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbSilkscreenOval(
  pcbSilkscreenOval: PcbSilkscreenOval,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const {
    center,
    radius_x,
    radius_y,
    layer = "top",
    pcb_silkscreen_oval_id,
    ccw_rotation = 0,
  } = pcbSilkscreenOval

  if (layerFilter && layer !== layerFilter) return []

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof radius_x !== "number" ||
    typeof radius_y !== "number"
  ) {
    debugPcb(
      `[pcb_silkscreen_oval] Invalid data for "${pcb_silkscreen_oval_id}": expected center {x: number, y: number}, radius_x: number, radius_y: number, got center=${JSON.stringify(center)}, radius_x=${JSON.stringify(radius_x)}, radius_y=${JSON.stringify(radius_y)}`,
    )
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])

  const transformedRadiusX = radius_x * Math.abs(transform.a)
  const transformedRadiusY = radius_y * Math.abs(transform.d)

  const color =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  const svgObject: SvgObject = {
    name: "ellipse",
    type: "element",
    attributes: {
      cx: transformedX.toString(),
      cy: transformedY.toString(),
      rx: transformedRadiusX.toString(),
      ry: transformedRadiusY.toString(),
      fill: "none",
      stroke: color,
      "stroke-width": (0.1 * Math.abs(transform.a)).toString(),
      class: `pcb-silkscreen-oval pcb-silkscreen-${layer}`,
      "data-pcb-silkscreen-oval-id": pcb_silkscreen_oval_id,
      "data-type": "pcb_silkscreen_oval",
      "data-pcb-layer": layer,
      ...(ccw_rotation !== 0 && {
        transform: `rotate(${-ccw_rotation} ${transformedX} ${transformedY})`,
      }),
    },
    value: "",
    children: [],
  }

  return [svgObject]
}
