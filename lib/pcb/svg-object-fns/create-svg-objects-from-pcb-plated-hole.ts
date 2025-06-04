import type { PCBPlatedHole } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbPlatedHole(
  hole: PCBPlatedHole,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap } = ctx
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
              fill: colorMap.copper.top,
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
              fill: colorMap.drill,

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
              fill: colorMap.copper.top,
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
              fill: colorMap.drill,

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

  // Handle circular hole with rectangular pad (hole is circle, outer pad is rectangle)
  if (hole.shape === "circular_hole_with_rect_pad") {
    const scaledHoleDiameter = hole.hole_diameter * Math.abs(transform.a)
    const scaledRectPadWidth = hole.rect_pad_width * Math.abs(transform.a)
    const scaledRectPadHeight = hole.rect_pad_height * Math.abs(transform.a)

    const holeRadius = scaledHoleDiameter / 2

    return [
      {
        name: "g",
        type: "element",
        children: [
          // Rectangular pad (outer shape)
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-pad",
              fill: colorMap.copper.top,
              x: (x - scaledRectPadWidth / 2).toString(),
              y: (y - scaledRectPadHeight / 2).toString(),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
            },
            value: "",
            children: [],
          },
          // Circular hole inside the rectangle
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "pcb-hole-inner",
              fill: colorMap.drill,
              cx: x.toString(),
              cy: y.toString(),
              r: holeRadius.toString(),
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
  if (hole.shape === "pill_hole_with_rect_pad") {
    const scaledRectPadWidth = hole.rect_pad_width * Math.abs(transform.a)
    const scaledRectPadHeight = hole.rect_pad_height * Math.abs(transform.a)

    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a)
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a)

    // Use the minimum of scaledHoleHeight and scaledHoleWidth for the radius
    const holeRadius = Math.min(scaledHoleHeight, scaledHoleWidth) / 2

    return [
      {
        name: "g",
        type: "element",
        children: [
          // Rectangular pad (outer shape)
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-pad",
              fill: colorMap.copper.top,
              x: (x - scaledRectPadWidth / 2).toString(),
              y: (y - scaledRectPadHeight / 2).toString(),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
            },
            value: "",
            children: [],
          },
          // pill hole inside the rectangle
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "pcb-hole-inner",
              fill: colorMap.drill,
              x: (x - scaledHoleWidth / 2).toString(),
              y: (y - scaledHoleHeight / 2).toString(),
              width: scaledHoleWidth.toString(),
              height: scaledHoleHeight.toString(),
              rx: holeRadius.toString(),
              ry: holeRadius.toString(),
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
