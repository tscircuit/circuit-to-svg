import type { PCBVia } from "circuit-json"
import { applyToPoint } from "transformation-matrix"

export function createSvgObjectsFromPcbVia(hole: PCBVia, transform: any): any {
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])
  const scaledOuterWidth = hole.outer_diameter * Math.abs(transform.a)
  const scaledOuterHeight = hole.outer_diameter * Math.abs(transform.a)
  const scaledHoleWidth = hole.hole_diameter * Math.abs(transform.a)
  const scaledHoleHeight = hole.hole_diameter * Math.abs(transform.a)

  const outerRadius = Math.min(scaledOuterWidth, scaledOuterHeight) / 2
  const innerRadius = Math.min(scaledHoleWidth, scaledHoleHeight) / 2
  return {
    name: "g",
    type: "element",
    children: [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-hole-outer",
          fill: "rgb(200, 52, 52)",
          cx: x.toString(),
          cy: y.toString(),
          r: outerRadius.toString(),
        },
      },
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-hole-inner",
          fill: "rgb(255, 38, 226)",

          cx: x.toString(),
          cy: y.toString(),
          r: innerRadius.toString(),
        },
      },
    ],
  }
}
