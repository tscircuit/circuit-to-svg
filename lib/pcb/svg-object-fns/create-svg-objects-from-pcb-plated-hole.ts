import type { PCBPlatedHole } from "@tscircuit/soup"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"

export function createSvgObjectsFromPcbPlatedHole(
  hole: PCBPlatedHole,
  transform: any,
): SvgObject[] {
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])

  if (hole.shape === "pill") {
    const scaledOuterWidth = hole.outer_width * Math.abs(transform.a)
    const scaledOuterHeight = hole.outer_height * Math.abs(transform.a)
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a)

    const outerRadiusX = scaledOuterWidth / 2
    const outerRadiusY = scaledOuterHeight / 2
    const innerRadiusX = scaledHoleWidth / 2
    const innerRadiusY = scaledHoleHeight / 2
    const straightLength = scaledOuterHeight - scaledOuterWidth

    return [
      {
        name: "g",
        type: "element",
        children: [
          // Outer pill shape
          {
            name: "path",
            type: "element",
            attributes: {
              class: "pcb-hole-outer",
              d:
                `M${x - outerRadiusX},${y - straightLength / 2} ` +
                `v${straightLength} ` +
                `a${outerRadiusX},${outerRadiusX} 0 0 0 ${scaledOuterWidth},0 ` +
                `v-${straightLength} ` +
                `a${outerRadiusX},${outerRadiusX} 0 0 0 -${scaledOuterWidth},0 z`,
            },
            value: "",
            children: [],
          },
          // Inner pill shape
          {
            name: "path",
            type: "element",
            attributes: {
              class: "pcb-hole-inner",
              d:
                `M${x - innerRadiusX},${y - (scaledHoleHeight - scaledHoleWidth) / 2} ` +
                `v${scaledHoleHeight - scaledHoleWidth} ` +
                `a${innerRadiusX},${innerRadiusX} 0 0 0 ${scaledHoleWidth},0 ` +
                `v-${scaledHoleHeight - scaledHoleWidth} ` +
                `a${innerRadiusX},${innerRadiusX} 0 0 0 -${scaledHoleWidth},0 z`,
            },
            value: "",
            children: [],
          },
        ],
        value: "",
        attributes: {},
      },
    ]
  }
  // Fallback to circular hole if not pill-shaped
  if (hole.shape === "circle") {
    const scaledOuterWidth = hole.outer_diameter * Math.abs(transform.a)
    const scaledOuterHeight = hole.outer_diameter * Math.abs(transform.a)
    const scaledHoleWidth = hole.hole_diameter * Math.abs(transform.a)
    const scaledHoleHeight = hole.hole_diameter * Math.abs(transform.a)

    const outerRadius = Math.min(scaledOuterWidth, scaledOuterHeight) / 2
    const innerRadius = Math.min(scaledHoleWidth, scaledHoleHeight) / 2
    return [
      {
        name: "g",
        type: "element",
        children: [
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "pcb-hole-outer",
              cx: x.toString(),
              cy: y.toString(),
              r: outerRadius.toString(),
            },
            value: "",
            children: [],
          },
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "pcb-hole-inner",
              cx: x.toString(),
              cy: y.toString(),
              r: innerRadius.toString(),
            },
            value: "",
            children: [],
          },
        ],
        value: "",
        attributes: {},
      },
    ]
  }
  return []
}
