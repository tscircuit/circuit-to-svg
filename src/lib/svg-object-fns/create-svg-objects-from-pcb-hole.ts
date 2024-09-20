import type { PCBHole } from "@tscircuit/soup"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { SvgObject } from "../svg-object"
import { HOLE_COLOR } from "../colors"

export function createSvgObjectsFromPcbHole(
  hole: PCBHole,
  transform: Matrix,
): SvgObject[] {
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])

  if (hole.hole_shape === "circle" || hole.hole_shape === "square") {
    const scaledDiameter = hole.hole_diameter * Math.abs(transform.a)
    const radius = scaledDiameter / 2

    if (hole.hole_shape === "circle") {
      return [
        {
          name: "circle",
          type: "element",
          attributes: {
            class: "pcb-hole",
            cx: x.toString(),
            cy: y.toString(),
            r: radius.toString(),
            fill: HOLE_COLOR,
          },
          children: [],
          value: "",
        },
      ]
    }
    // Square hole
    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-hole",
          x: (x - radius).toString(),
          y: (y - radius).toString(),
          width: scaledDiameter.toString(),
          height: scaledDiameter.toString(),
          fill: HOLE_COLOR,
        },
        children: [],
        value: "",
      },
    ]
  }
  if (hole.hole_shape === "oval") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHeight = hole.hole_height * Math.abs(transform.a)
    const rx = scaledWidth / 2
    const ry = scaledHeight / 2

    return [
      {
        name: "ellipse",
        type: "element",
        attributes: {
          class: "pcb-hole",
          cx: x.toString(),
          cy: y.toString(),
          rx: rx.toString(),
          ry: ry.toString(),
          fill: HOLE_COLOR,
        },
        children: [],
        value: "",
      },
    ]
  }

  return []
}
