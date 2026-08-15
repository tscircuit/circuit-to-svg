import type { PCBVia } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbVia(hole: PCBVia, ctx: PcbContext): any {
  const { transform, colorMap } = ctx
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])
  const scaledOuterWidth = Math.abs(hole.outer_diameter * transform.a)
  const scaledOuterHeight = Math.abs(hole.outer_diameter * transform.a)
  const scaledHoleWidth = Math.abs(hole.hole_diameter * transform.a)
  const scaledHoleHeight = Math.abs(hole.hole_diameter * transform.a)

  const outerRadius = Math.min(scaledOuterWidth, scaledOuterHeight) / 2
  const innerRadius = Math.min(scaledHoleWidth, scaledHoleHeight) / 2
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
