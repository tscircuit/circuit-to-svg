import type { PcbBend } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbBend(
  bend: PcbBend,
  ctx: PcbContext,
): SvgObject[] {
  const board = ctx.boardOwnerMap?.get(bend.pcb_board_id)
  if (!board) return []

  // Bend endpoints are board-local millimeters (+X right, +Y up in the top view).
  // Translate once by the referenced board center into world XY for the SVG transform.
  // Ownership groups introduce no additional transform for serialized bends.
  const [startX, startY] = applyToPoint(ctx.transform, [
    board.center.x + bend.start.x,
    board.center.y + bend.start.y,
  ])
  const [endX, endY] = applyToPoint(ctx.transform, [
    board.center.x + bend.end.x,
    board.center.y + bend.end.y,
  ])
  const scale = Math.abs(ctx.transform.a)

  return [
    {
      name: "line",
      type: "element",
      value: "",
      attributes: {
        x1: startX.toString(),
        y1: startY.toString(),
        x2: endX.toString(),
        y2: endY.toString(),
        stroke: "#ffd54f",
        "stroke-width": (0.15 * scale).toString(),
        "stroke-dasharray": `${0.75 * scale} ${0.4 * scale}`,
        "stroke-linecap": "butt",
        class: "pcb-bend-line",
        "data-type": "pcb_bend",
        "data-pcb-bend-id": bend.pcb_bend_id,
        "data-pcb-board-id": bend.pcb_board_id,
        "data-pcb-layer": "overlay",
      },
      children: [
        {
          name: "title",
          type: "element",
          value: "",
          attributes: {},
          children: [
            {
              name: "",
              type: "text",
              value: `${bend.name ?? bend.pcb_bend_id}: ${bend.bend_angle}°, radius ${bend.bend_radius} mm`,
              attributes: {},
              children: [],
            },
          ],
        },
      ],
    },
  ]
}
