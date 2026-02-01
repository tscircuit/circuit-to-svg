import type { PcbNotePath } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { colorMap } from "lib/utils/colors"

const DEFAULT_OVERLAY_COLOR = colorMap.board.user_2

export function createSvgObjectsFromPcbNotePath(
  notePath: PcbNotePath,
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx

  if (!Array.isArray(notePath.route) || notePath.route.length === 0) {
    console.error(
      `[pcb_note_path] Invalid route for "${notePath.pcb_note_path_id}": expected non-empty array of points, got ${JSON.stringify(notePath.route)}`,
    )
    return []
  }

  for (const point of notePath.route) {
    if (typeof point.x !== "number" || typeof point.y !== "number") {
      console.error(
        `[pcb_note_path] Invalid point in route for "${notePath.pcb_note_path_id}": expected {x: number, y: number}, got ${JSON.stringify(point)}`,
      )
      return []
    }
  }

  const pathD = notePath.route
    .map((point, index) => {
      const [x, y] = applyToPoint(transform, [point.x, point.y])
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(" ")

  const strokeWidth = notePath.stroke_width * Math.abs(transform.a)

  const svgObject: SvgObject = {
    name: "path",
    type: "element",
    value: "",
    attributes: {
      d: pathD,
      stroke: notePath.color ?? DEFAULT_OVERLAY_COLOR,
      fill: "none",
      "stroke-width": strokeWidth.toString(),
      class: "pcb-note-path",
      "data-type": "pcb_note_path",
      "data-pcb-note-path-id": notePath.pcb_note_path_id,
      "data-pcb-layer": "overlay",
    },
    children: [],
  }

  return [svgObject]
}
