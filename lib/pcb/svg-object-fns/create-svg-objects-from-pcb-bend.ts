import { glyphAdvanceRatio, textMetrics } from "@tscircuit/alphabet"
import type { PcbBend } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { ALPHABET_FONT_FAMILY } from "lib/utils/stringify-svg"
import {
  applyToPoint,
  compose,
  rotate,
  toString as matrixToString,
  translate,
} from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

const BEND_LABEL = "BEND LINE"
const LABEL_WIDTH_RATIO = Array.from(BEND_LABEL).reduce(
  (width, character) =>
    width + (glyphAdvanceRatio[character] ?? textMetrics.spaceWidthRatio),
  0,
)

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
  const lineLength = Math.hypot(endX - startX, endY - startY)
  const fontSize = Math.min(2 * scale, (lineLength * 0.8) / LABEL_WIDTH_RATIO)
  // Derive the label's baseline from the emitted SVG endpoints (+Y down,
  // pixels), as fabrication-note dimensions do. Keep the text upright even
  // when the Circuit JSON endpoints are reversed, without mirroring glyphs.
  let labelAngle = Math.atan2(endY - startY, endX - startX)
  if (labelAngle >= Math.PI / 2) labelAngle -= Math.PI
  if (labelAngle < -Math.PI / 2) labelAngle += Math.PI
  const labelTransform = compose(
    translate((startX + endX) / 2, (startY + endY) / 2),
    rotate(labelAngle),
  )

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
    ...(lineLength > 0
      ? [
          {
            name: "text",
            type: "element",
            value: "",
            attributes: {
              x: "0",
              y: (-(fontSize * 0.6 + 0.2 * scale)).toString(),
              fill: "#ffd54f",
              "font-family": ALPHABET_FONT_FAMILY,
              "font-size": fontSize.toString(),
              "text-anchor": "middle",
              "dominant-baseline": "central",
              transform: matrixToString(labelTransform),
              class: "pcb-bend-line-label",
              "data-type": "pcb_bend",
              "data-pcb-bend-id": bend.pcb_bend_id,
              "data-pcb-board-id": bend.pcb_board_id,
              "data-pcb-layer": "overlay",
            },
            children: [
              {
                name: "",
                type: "text",
                value: BEND_LABEL,
                attributes: {},
                children: [],
              },
            ],
          } satisfies SvgObject,
        ]
      : []),
  ]
}
