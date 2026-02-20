import type {
  PCBPlatedHole,
  PcbHoleCircularWithRectPad,
  PcbHolePillWithRectPad,
  PcbHoleRotatedPillWithRectPad,
} from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { AssemblySvgContext } from "../convert-circuit-json-to-assembly-svg"

const PAD_COLOR = "rgb(210, 210, 210)" // Lighter gray for pads
const HOLE_COLOR = "rgb(190, 190, 190)" // Darker gray for holes

type HoleWithRectPadOffsets = {
  hole_offset_x?: number
  hole_offset_y?: number
}

export function createSvgObjectsFromAssemblyPlatedHole(
  hole: PCBPlatedHole,
  ctx: AssemblySvgContext,
): SvgObject[] {
  const { transform } = ctx
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])

  if (hole.shape === "pill") {
    const scaledOuterWidth = hole.outer_width * Math.abs(transform.a)
    const scaledOuterHeight = hole.outer_height * Math.abs(transform.a)
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a)

    const outerRadiusX = scaledOuterWidth / 2
    const straightLength = scaledOuterHeight - scaledOuterWidth
    const innerRadiusX = scaledHoleWidth / 2

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
              class: "assembly-hole-outer",
              fill: PAD_COLOR,
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
              class: "assembly-hole-inner",
              fill: HOLE_COLOR,
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
              class: "assembly-hole-outer",
              fill: PAD_COLOR,
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
              class: "assembly-hole-inner",
              fill: HOLE_COLOR,
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
    const circularHole = hole as PcbHoleCircularWithRectPad
    const scaledHoleDiameter =
      circularHole.hole_diameter * Math.abs(transform.a)
    const scaledRectPadWidth =
      circularHole.rect_pad_width * Math.abs(transform.a)
    const scaledRectPadHeight =
      circularHole.rect_pad_height * Math.abs(transform.a)
    const scaledRectBorderRadius =
      (circularHole.rect_border_radius ?? 0) * Math.abs(transform.a)
    const rectCcwRotation = circularHole.rect_ccw_rotation ?? 0

    const holeRadius = scaledHoleDiameter / 2
    const [holeCx, holeCy] = applyToPoint(transform, [
      circularHole.x + circularHole.hole_offset_x,
      circularHole.y + circularHole.hole_offset_y,
    ])

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
              class: "assembly-hole-outer-pad",
              fill: PAD_COLOR,
              ...(rectCcwRotation
                ? {
                    x: (-scaledRectPadWidth / 2).toString(),
                    y: (-scaledRectPadHeight / 2).toString(),
                    transform: `translate(${x} ${y}) rotate(${-rectCcwRotation})`,
                  }
                : {
                    x: (x - scaledRectPadWidth / 2).toString(),
                    y: (y - scaledRectPadHeight / 2).toString(),
                  }),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
              ...(scaledRectBorderRadius
                ? {
                    rx: scaledRectBorderRadius.toString(),
                    ry: scaledRectBorderRadius.toString(),
                  }
                : {}),
            },
            value: "",
            children: [],
          },
          // Circular hole inside the rectangle
          {
            name: "circle",
            type: "element",
            attributes: {
              class: "assembly-hole-inner",
              fill: HOLE_COLOR,
              cx: holeCx.toString(),
              cy: holeCy.toString(),
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
    const pillHole = hole as PcbHolePillWithRectPad
    const scaledRectPadWidth = pillHole.rect_pad_width * Math.abs(transform.a)
    const scaledRectPadHeight = pillHole.rect_pad_height * Math.abs(transform.a)
    const scaledRectBorderRadius =
      (pillHole.rect_border_radius ?? 0) * Math.abs(transform.a)

    const scaledHoleHeight = pillHole.hole_height * Math.abs(transform.a)
    const scaledHoleWidth = pillHole.hole_width * Math.abs(transform.a)

    const pillHoleWithOffsets = pillHole as PcbHolePillWithRectPad &
      HoleWithRectPadOffsets
    const holeOffsetX = pillHoleWithOffsets.hole_offset_x ?? 0
    const holeOffsetY = pillHoleWithOffsets.hole_offset_y ?? 0
    const [holeCenterX, holeCenterY] = applyToPoint(transform, [
      pillHole.x + holeOffsetX,
      pillHole.y + holeOffsetY,
    ])

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
              class: "assembly-hole-outer-pad",
              fill: PAD_COLOR,
              x: (x - scaledRectPadWidth / 2).toString(),
              y: (y - scaledRectPadHeight / 2).toString(),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
              ...(scaledRectBorderRadius
                ? {
                    rx: scaledRectBorderRadius.toString(),
                    ry: scaledRectBorderRadius.toString(),
                  }
                : {}),
            },
            value: "",
            children: [],
          },
          // pill hole inside the rectangle
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "assembly-hole-inner",
              fill: HOLE_COLOR,
              x: (holeCenterX - scaledHoleWidth / 2).toString(),
              y: (holeCenterY - scaledHoleHeight / 2).toString(),
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

  if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    const rotatedHole = hole as PcbHoleRotatedPillWithRectPad
    const scaledRectPadWidth =
      rotatedHole.rect_pad_width * Math.abs(transform.a)
    const scaledRectPadHeight =
      rotatedHole.rect_pad_height * Math.abs(transform.a)
    const scaledRectBorderRadius =
      (rotatedHole.rect_border_radius ?? 0) * Math.abs(transform.a)

    const scaledHoleHeight = rotatedHole.hole_height * Math.abs(transform.a)
    const scaledHoleWidth = rotatedHole.hole_width * Math.abs(transform.a)

    const rotatedHoleWithOffsets =
      rotatedHole as PcbHoleRotatedPillWithRectPad & HoleWithRectPadOffsets
    const holeOffsetX = rotatedHoleWithOffsets.hole_offset_x ?? 0
    const holeOffsetY = rotatedHoleWithOffsets.hole_offset_y ?? 0
    const [holeCenterX, holeCenterY] = applyToPoint(transform, [
      rotatedHole.x + holeOffsetX,
      rotatedHole.y + holeOffsetY,
    ])

    const holeRadius = Math.min(scaledHoleHeight, scaledHoleWidth) / 2

    return [
      {
        name: "g",
        type: "element",
        children: [
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "assembly-hole-outer-pad",
              fill: PAD_COLOR,
              x: (-scaledRectPadWidth / 2).toString(),
              y: (-scaledRectPadHeight / 2).toString(),
              width: scaledRectPadWidth.toString(),
              height: scaledRectPadHeight.toString(),
              transform: `translate(${x} ${y}) rotate(${-rotatedHole.rect_ccw_rotation})`,
              ...(scaledRectBorderRadius
                ? {
                    rx: scaledRectBorderRadius.toString(),
                    ry: scaledRectBorderRadius.toString(),
                  }
                : {}),
            },
            value: "",
            children: [],
          },
          {
            name: "rect",
            type: "element",
            attributes: {
              class: "assembly-hole-inner",
              fill: HOLE_COLOR,
              x: (-scaledHoleWidth / 2).toString(),
              y: (-scaledHoleHeight / 2).toString(),
              width: scaledHoleWidth.toString(),
              height: scaledHoleHeight.toString(),
              rx: holeRadius.toString(),
              ry: holeRadius.toString(),
              transform: `translate(${holeCenterX} ${holeCenterY}) rotate(${-rotatedHole.hole_ccw_rotation})`,
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
