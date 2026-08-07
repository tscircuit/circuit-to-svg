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

  const outerRadius = Math.min(scaledOuterWidth, scaledOuterHeight) / 2
  const innerRadius = Math.min(scaledHoleWidth, scaledHoleHeight) / 2

  // A non-finite diameter (e.g. an unparseable `outer_diameter`/`hole_diameter`
  // arriving as NaN) would stringify to r="NaN", which is not a valid SVG
  // length — renderers discard the whole <circle>. Skip the invalid circle
  // instead of emitting broken markup. See tscircuit/circuit-to-svg#634.
  const children = []
  if (Number.isFinite(outerRadius)) {
    children.push({
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
    })
  }
  if (Number.isFinite(innerRadius)) {
    children.push({
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
    })
  }

  return {
    name: "g",
    type: "element",
    attributes: {
      "data-type": "pcb_via",
      "data-pcb-layer": "through",
    },
    children,
  }
}
