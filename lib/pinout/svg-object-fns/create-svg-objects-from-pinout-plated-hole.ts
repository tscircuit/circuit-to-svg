import type {
  PCBPlatedHole,
  PcbHoleCircularWithRectPad,
  PcbHolePillWithRectPad,
  PcbHoleRotatedPillWithRectPad,
} from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PinoutSvgContext } from "../convert-circuit-json-to-pinout-svg"

const PAD_COLOR = "rgb(218, 165, 32)" // More vibrant gold
const HOLE_COLOR = "rgb(40, 40, 40)" // Darker gray for contrast

type HoleWithRectPadOffsets = {
  hole_offset_x?: number
  hole_offset_y?: number
}

const createPillPath = (width: number, height: number) => {
  if (width > height) {
    const radius = height / 2
    const straightLength = width - 2 * radius
    return (
      `M${-width / 2 + radius},${-radius} ` +
      `h${straightLength} ` +
      `a${radius},${radius} 0 0 1 0,${height} ` +
      `h${-straightLength} ` +
      `a${radius},${radius} 0 0 1 0,${-height} ` +
      `z`
    )
  }
  if (height > width) {
    const radius = width / 2
    const straightLength = height - 2 * radius
    return (
      `M${radius},${-height / 2 + radius} ` +
      `v${straightLength} ` +
      `a${radius},${radius} 0 0 1 ${-width},0 ` +
      `v${-straightLength} ` +
      `a${radius},${radius} 0 0 1 ${width},0 ` +
      `z`
    )
  }
  const radius = width / 2
  return (
    `M${-radius},0 ` +
    `a${radius},${radius} 0 0 1 ${width},0 ` +
    `a${radius},${radius} 0 0 1 ${-width},0 ` +
    `z`
  )
}

export function createSvgObjectsFromPinoutPlatedHole(
  hole: PCBPlatedHole,
  ctx: PinoutSvgContext,
): SvgObject[] {
  const { transform } = ctx
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])

  if (hole.shape === "pill") {
    const scaledOuterWidth = hole.outer_width * Math.abs(transform.a)
    const scaledOuterHeight = hole.outer_height * Math.abs(transform.a)
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a)
    const rotation = hole.ccw_rotation || 0

    if (
      scaledOuterWidth > scaledOuterHeight ||
      scaledHoleWidth > scaledHoleHeight ||
      rotation
    ) {
      const pillTransform = rotation
        ? `translate(${x} ${y}) rotate(${-rotation})`
        : `translate(${x} ${y})`

      return [
        {
          name: "g",
          type: "element",
          children: [
            {
              name: "path",
              type: "element",
              attributes: {
                class: "pinout-hole-outer",
                fill: PAD_COLOR,
                d: createPillPath(scaledOuterWidth, scaledOuterHeight),
                transform: pillTransform,
              },
              value: "",
              children: [],
            },
            {
              name: "path",
              type: "element",
              attributes: {
                class: "pinout-hole-inner",
                fill: HOLE_COLOR,
                d: createPillPath(scaledHoleWidth, scaledHoleHeight),
                transform: pillTransform,
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
              class: "pinout-hole-outer",
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
              class: "pinout-hole-inner",
              fill: HOLE_COLOR,
              d:
                `M${x - innerRadiusX},${
                  y - (scaledHoleHeight - scaledHoleWidth) / 2
                } ` +
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

  if (hole.shape === "oval") {
    const scaledOuterWidth = hole.outer_width * Math.abs(transform.a)
    const scaledOuterHeight = hole.outer_height * Math.abs(transform.a)
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a)
    const rotation = hole.ccw_rotation || 0

    const transformStr = rotation
      ? `translate(${x} ${y}) rotate(${-rotation})`
      : `translate(${x} ${y})`

    return [
      {
        name: "g",
        type: "element",
        children: [
          {
            name: "ellipse",
            type: "element",
            attributes: {
              class: "pinout-hole-outer",
              fill: PAD_COLOR,
              cx: "0",
              cy: "0",
              rx: (scaledOuterWidth / 2).toString(),
              ry: (scaledOuterHeight / 2).toString(),
              transform: transformStr,
            },
            value: "",
            children: [],
          },
          {
            name: "ellipse",
            type: "element",
            attributes: {
              class: "pinout-hole-inner",
              fill: HOLE_COLOR,
              cx: "0",
              cy: "0",
              rx: (scaledHoleWidth / 2).toString(),
              ry: (scaledHoleHeight / 2).toString(),
              transform: transformStr,
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
              class: "pinout-hole-outer",
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
              class: "pinout-hole-inner",
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

  // Handle circular hole with rectangular pad
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
      circularHole.x + (circularHole.hole_offset_x ?? 0),
      circularHole.y + (circularHole.hole_offset_y ?? 0),
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
              class: "pinout-hole-outer-pad",
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
              class: "pinout-hole-inner",
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
              class: "pinout-hole-outer-pad",
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
              class: "pinout-hole-inner",
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
              class: "pinout-hole-outer-pad",
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
              class: "pinout-hole-inner",
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

  if (hole.shape === "hole_with_polygon_pad") {
    const polygonHole = hole
    const rotation = polygonHole.ccw_rotation ?? 0
    const padOutline = polygonHole.pad_outline || []
    const holeX = polygonHole.x ?? 0
    const holeY = polygonHole.y ?? 0

    const padPoints = padOutline.map((point: { x: number; y: number }) =>
      applyToPoint(transform, [holeX + point.x, holeY + point.y]),
    )
    const padPointsString = padPoints
      .map((p: number[]) => p.join(","))
      .join(" ")

    const [holeCenterX, holeCenterY] = applyToPoint(transform, [
      holeX + (polygonHole.hole_offset_x ?? 0),
      holeY + (polygonHole.hole_offset_y ?? 0),
    ])

    const createHoleSvgObject = (): SvgObject => {
      if (polygonHole.hole_shape === "circle") {
        const scaledDiameter =
          (polygonHole.hole_diameter ?? 0) * Math.abs(transform.a)
        const radius = scaledDiameter / 2
        return {
          name: "circle",
          type: "element",
          attributes: {
            class: "pinout-hole-inner",
            fill: HOLE_COLOR,
            cx: holeCenterX.toString(),
            cy: holeCenterY.toString(),
            r: radius.toString(),
          },
          value: "",
          children: [],
        }
      }

      if (polygonHole.hole_shape === "oval") {
        const scaledWidth =
          (polygonHole.hole_width ?? 0) * Math.abs(transform.a)
        const scaledHeight =
          (polygonHole.hole_height ?? 0) * Math.abs(transform.a)
        const rx = scaledWidth / 2
        const ry = scaledHeight / 2
        return {
          name: "ellipse",
          type: "element",
          attributes: {
            class: "pinout-hole-inner",
            fill: HOLE_COLOR,
            cx: holeCenterX.toString(),
            cy: holeCenterY.toString(),
            rx: rx.toString(),
            ry: ry.toString(),
          },
          value: "",
          children: [],
        }
      }

      if (
        polygonHole.hole_shape === "pill" ||
        polygonHole.hole_shape === "rotated_pill"
      ) {
        const scaledWidth =
          (polygonHole.hole_width ?? 0) * Math.abs(transform.a)
        const scaledHeight =
          (polygonHole.hole_height ?? 0) * Math.abs(transform.a)
        const pathD = createPillPath(scaledWidth, scaledHeight)

        return {
          name: "path",
          type: "element",
          attributes: {
            class: "pinout-hole-inner",
            fill: HOLE_COLOR,
            d: pathD,
            transform: `translate(${holeCenterX} ${holeCenterY})`,
          },
          value: "",
          children: [],
        }
      }

      return {
        name: "g",
        type: "element",
        attributes: {},
        value: "",
        children: [],
      }
    }

    return [
      {
        name: "g",
        type: "element",
        attributes: {
          ...(rotation ? { transform: `rotate(${-rotation} ${x} ${y})` } : {}),
        },
        children: [
          {
            name: "polygon",
            type: "element",
            attributes: {
              class: "pinout-hole-outer-pad",
              fill: PAD_COLOR,
              points: padPointsString,
            },
            value: "",
            children: [],
          },
          createHoleSvgObject(),
        ],
        value: "",
      },
    ]
  }

  return []
}
