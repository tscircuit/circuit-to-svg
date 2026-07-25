import type { PCBVia } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbVia(hole: PCBVia, ctx: PcbContext): any {
  const { transform, colorMap } = ctx
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])
  const scaledOuterWidth = hole.outer_diameter * Math.abs(transform.a)
  const scaledOuterHeight = hole.outer_diameter * Math.abs(transform.a)
  const scaledHoleWidth = hole.hole_diameter * Math.abs(transform.a)
  const scaledHoleHeight = hole.hole_diameter * Math.abs(transform.a)

  const rawOuterRadius = Math.min(scaledOuterWidth, scaledOuterHeight) / 2
  const rawInnerRadius = Math.min(scaledHoleWidth, scaledHoleHeight) / 2

  // A missing or unparseable diameter arrives here as null/NaN and would be
  // written as r="NaN", which is not a valid SVG length — renderers drop the
  // circle entirely, so the drill silently disappears instead of looking wrong.
  // Fall back to 0 so the attribute stays a valid length.
  const outerRadius = Number.isFinite(rawOuterRadius) ? rawOuterRadius : 0
  const innerRadius = Number.isFinite(rawInnerRadius) ? rawInnerRadius : 0

  return {
    name: "g",
    type: "element",
    attributes: {
      "data-type": "pcb_via",
      "data-pcb-layer": "through",
    },
    children: [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-hole-outer",
          fill: colorMap.copper.top,
          cx: x.toString(),
          cy: y.toString(),
          r: outerRadius.toString(),
          "data-type": "pcb_via",
          "data-pcb-layer": "top",
        },
      },
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-hole-inner",
          fill: colorMap.drill,

          cx: x.toString(),
          cy: y.toString(),
          r: innerRadius.toString(),
          "data-type": "pcb_via",
          "data-pcb-layer": "drill",
        },
      },
    ],
  }
}
