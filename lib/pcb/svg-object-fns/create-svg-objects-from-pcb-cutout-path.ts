import type { PcbCutoutPath } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCutoutPath(
  cutoutPath: PcbCutoutPath,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap } = ctx
  if (!cutoutPath.route || !Array.isArray(cutoutPath.route)) return []

  // Close the path if the first and last points are the same
  const firstPoint = cutoutPath.route[0]
  const lastPoint = cutoutPath.route[cutoutPath.route.length - 1]
  const isClosed =
    firstPoint &&
    lastPoint &&
    firstPoint.x === lastPoint.x &&
    firstPoint.y === lastPoint.y

  const path =
    cutoutPath.route
      .slice(0, isClosed ? -1 : undefined)
      .map((point: any, index: number) => {
        const [x, y] = applyToPoint(transform, [point.x, point.y])
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(" ") + (isClosed ? " Z" : "")

  // A path cutout is a slot of slot_width milled along the route, optionally
  // split into slots of slot_length separated by space_between_slots.
  const scale = Math.abs(transform.a)
  const slotWidth = cutoutPath.slot_width * scale
  const slotCornerRadius =
    cutoutPath.slot_corner_radius ?? cutoutPath.slot_width / 2
  const lineCap = slotCornerRadius > 0 ? "round" : "butt"
  const dashAttributes: Record<string, string> = {}
  if (
    cutoutPath.slot_length !== undefined &&
    cutoutPath.space_between_slots !== undefined
  ) {
    const slotLength = cutoutPath.slot_length * scale
    const spaceBetweenSlots = cutoutPath.space_between_slots * scale
    // Round caps extend each dash by half the slot width on both ends.
    const capExtension = lineCap === "round" ? slotWidth : 0
    dashAttributes["stroke-dasharray"] = `${Math.max(
      slotLength - capExtension,
      0,
    )} ${spaceBetweenSlots + capExtension}`
  }

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-cutout pcb-cutout-path",
        d: path,
        fill: "none",
        stroke: colorMap.drill,
        "stroke-width": slotWidth.toString(),
        "stroke-linecap": lineCap,
        "stroke-linejoin": "round",
        ...dashAttributes,
        "data-type": "pcb_cutout_path",
        "data-pcb-cutout-id": cutoutPath.pcb_cutout_id,
        "data-pcb-layer": "drill",
      },
      value: "",
      children: [],
    },
  ]
}
