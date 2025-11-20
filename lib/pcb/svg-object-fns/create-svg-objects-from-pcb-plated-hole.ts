import type {
  PcbPlatedHole,
  PcbHoleCircularWithRectPad,
  PcbHolePillWithRectPad,
  PcbHoleRotatedPillWithRectPad,
} from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

type HoleWithRectPadOffsets = {
  hole_offset_x?: number
  hole_offset_y?: number
}

export function createSvgObjectsFromPcbPlatedHole(
  hole: PcbPlatedHole,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap, showSolderMask } = ctx
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])
  const copperLayer =
    (Array.isArray((hole as any).layers) && (hole as any).layers[0]) ||
    (hole as any).layer ||
    "top"

  const isCoveredWithSolderMask = Boolean(hole.is_covered_with_solder_mask)

  // Positive margin: mask extends beyond hole (less hole exposed)
  // Negative margin: mask is smaller than hole (spacing around edges)
  const soldermaskMargin = (hole.soldermask_margin ?? 0) * Math.abs(transform.a)

  // Show soldermask if it's enabled, the hole is covered, and there's a margin defined
  const shouldShowSolderMask =
    showSolderMask && isCoveredWithSolderMask && soldermaskMargin !== 0

  const solderMaskColor = colorMap.soldermask.top

  if (hole.shape === "pill") {
    const scaledOuterWidth = hole.outer_width * Math.abs(transform.a)
    const scaledOuterHeight = hole.outer_height * Math.abs(transform.a)
    const scaledHoleWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHoleHeight = hole.hole_height * Math.abs(transform.a)

    const rotation = hole.ccw_rotation || 0

    const outerTransform = rotation
      ? `translate(${x} ${y}) rotate(${-rotation})`
      : `translate(${x} ${y})`
    const innerTransform = rotation
      ? `translate(${x} ${y}) rotate(${-rotation})`
      : `translate(${x} ${y})`

    // Helper function to create pill path
    const createPillPath = (width: number, height: number) => {
      if (width > height) {
        // Horizontal pill (width > height)
        const radius = height / 2
        const straightLength = width - 2 * radius
        return (
          `M${-width / 2 + radius},${-radius} ` + // Start at top-left of straight section
          `h${straightLength} ` + // Line right along top
          `a${radius},${radius} 0 0 1 0,${height} ` + // Arc 180° around right end
          `h${-straightLength} ` + // Line left along bottom
          `a${radius},${radius} 0 0 1 0,${-height} ` + // Arc 180° around left end
          `z`
        )
      } else if (height > width) {
        // Vertical pill (height > width)
        const radius = width / 2
        const straightLength = height - 2 * radius
        return (
          `M${radius},${-height / 2 + radius} ` + // Start at top-right of straight section
          `v${straightLength} ` + // Line down along right side
          `a${radius},${radius} 0 0 1 ${-width},0 ` + // Arc 180° around bottom end
          `v${-straightLength} ` + // Line up along left side
          `a${radius},${radius} 0 0 1 ${width},0 ` + // Arc 180° around top end
          `z`
        )
      } else {
        // Circle (width === height)
        const radius = width / 2
        return (
          `M${-radius},0 ` +
          `a${radius},${radius} 0 0 1 ${width},0 ` + // Arc from left to right (top half)
          `a${radius},${radius} 0 0 1 ${-width},0 ` + // Arc from right to left (bottom half)
          `z`
        )
      }
    }

    const children: SvgObject[] = [
      // Outer pill shape
      {
        name: "path",
        type: "element",
        attributes: {
          class: "pcb-hole-outer",
          fill: colorMap.copper.top,
          d: createPillPath(scaledOuterWidth, scaledOuterHeight),
          transform: outerTransform,
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": copperLayer,
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
          d: createPillPath(scaledHoleWidth, scaledHoleHeight),
          transform: innerTransform,
          "data-type": "pcb_plated_hole_drill",
          "data-pcb-layer": "drill",
        },
        value: "",
        children: [],
      },
    ]

    // Add soldermask if needed
    if (shouldShowSolderMask) {
      const maskWidth = scaledOuterWidth + 2 * soldermaskMargin
      const maskHeight = scaledOuterHeight + 2 * soldermaskMargin
      children.push({
        name: "path",
        type: "element",
        attributes: {
          class: "pcb-solder-mask",
          fill: solderMaskColor,
          d: createPillPath(maskWidth, maskHeight),
          transform: outerTransform,
          "data-type": "pcb_soldermask",
        },
        value: "",
        children: [],
      })
    }

    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
        },
        children,
        value: "",
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

    const children: SvgObject[] = [
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-hole-outer",
          fill: colorMap.copper.top,
          cx: x.toString(),
          cy: y.toString(),
          r: outerRadius.toString(),
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": copperLayer,
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
          "data-type": "pcb_plated_hole_drill",
          "data-pcb-layer": "drill",
        },
        value: "",
        children: [],
      },
    ]

    // Add soldermask if needed
    if (shouldShowSolderMask) {
      const maskRadius = outerRadius + soldermaskMargin
      children.push({
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-solder-mask",
          fill: solderMaskColor,
          cx: x.toString(),
          cy: y.toString(),
          r: maskRadius.toString(),
          "data-type": "pcb_soldermask",
        },
        value: "",
        children: [],
      })
    }

    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
        },
        children,
        value: "",
      },
    ]
  }

  // Handle circular hole with rectangular pad (hole is circle, outer pad is rectangle)
  if (hole.shape === "circular_hole_with_rect_pad") {
    const h = hole as PcbHoleCircularWithRectPad
    const scaledHoleDiameter = hole.hole_diameter * Math.abs(transform.a)
    const scaledRectPadWidth = hole.rect_pad_width * Math.abs(transform.a)
    const scaledRectPadHeight = hole.rect_pad_height * Math.abs(transform.a)
    const scaledRectBorderRadius =
      ((hole as any).rect_border_radius ?? 0) * Math.abs(transform.a)

    const holeRadius = scaledHoleDiameter / 2
    const [holeCx, holeCy] = applyToPoint(transform, [
      h.x + (h.hole_offset_x ?? 0),
      h.y + (h.hole_offset_y ?? 0),
    ])

    const children: SvgObject[] = [
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
          ...(scaledRectBorderRadius
            ? {
                rx: scaledRectBorderRadius.toString(),
                ry: scaledRectBorderRadius.toString(),
              }
            : {}),
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": copperLayer,
        },
        value: "",
        children: [],
      },
      // Circular hole inside the rectangle (with optional offset)
      {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-hole-inner",
          fill: colorMap.drill,
          cx: holeCx.toString(),
          cy: holeCy.toString(),
          r: holeRadius.toString(),
          "data-type": "pcb_plated_hole_drill",
          "data-pcb-layer": "drill",
        },
        value: "",
        children: [],
      },
    ]

    // Add soldermask if needed
    if (shouldShowSolderMask) {
      const maskWidth = scaledRectPadWidth + 2 * soldermaskMargin
      const maskHeight = scaledRectPadHeight + 2 * soldermaskMargin
      const maskBorderRadius = scaledRectBorderRadius + soldermaskMargin
      children.push({
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-solder-mask",
          fill: solderMaskColor,
          x: (x - maskWidth / 2).toString(),
          y: (y - maskHeight / 2).toString(),
          width: maskWidth.toString(),
          height: maskHeight.toString(),
          ...(scaledRectBorderRadius
            ? {
                rx: maskBorderRadius.toString(),
                ry: maskBorderRadius.toString(),
              }
            : {}),
          "data-type": "pcb_soldermask",
        },
        value: "",
        children: [],
      })
    }

    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
        },
        children,
        value: "",
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

    const children: SvgObject[] = [
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
          ...(scaledRectBorderRadius
            ? {
                rx: scaledRectBorderRadius.toString(),
                ry: scaledRectBorderRadius.toString(),
              }
            : {}),
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": copperLayer,
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
          x: (holeCenterX - scaledHoleWidth / 2).toString(),
          y: (holeCenterY - scaledHoleHeight / 2).toString(),
          width: scaledHoleWidth.toString(),
          height: scaledHoleHeight.toString(),
          rx: holeRadius.toString(),
          ry: holeRadius.toString(),
          "data-type": "pcb_plated_hole_drill",
          "data-pcb-layer": "drill",
        },
        value: "",
        children: [],
      },
    ]

    // Add soldermask if needed
    if (shouldShowSolderMask) {
      const maskWidth = scaledRectPadWidth + 2 * soldermaskMargin
      const maskHeight = scaledRectPadHeight + 2 * soldermaskMargin
      const maskBorderRadius = scaledRectBorderRadius + soldermaskMargin
      children.push({
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-solder-mask",
          fill: solderMaskColor,
          x: (x - maskWidth / 2).toString(),
          y: (y - maskHeight / 2).toString(),
          width: maskWidth.toString(),
          height: maskHeight.toString(),
          ...(scaledRectBorderRadius
            ? {
                rx: maskBorderRadius.toString(),
                ry: maskBorderRadius.toString(),
              }
            : {}),
          "data-type": "pcb_soldermask",
        },
        value: "",
        children: [],
      })
    }

    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
        },
        children,
        value: "",
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

    const children: SvgObject[] = [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-hole-outer-pad",
          fill: colorMap.copper.top,
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
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": copperLayer,
        },
        value: "",
        children: [],
      },
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-hole-inner",
          fill: colorMap.drill,
          x: (-scaledHoleWidth / 2).toString(),
          y: (-scaledHoleHeight / 2).toString(),
          width: scaledHoleWidth.toString(),
          height: scaledHoleHeight.toString(),
          rx: holeRadius.toString(),
          ry: holeRadius.toString(),
          transform: `translate(${holeCenterX} ${holeCenterY}) rotate(${-rotatedHole.hole_ccw_rotation})`,
          "data-type": "pcb_plated_hole_drill",
          "data-pcb-layer": "drill",
        },
        value: "",
        children: [],
      },
    ]

    // Add soldermask if needed
    if (shouldShowSolderMask) {
      const maskWidth = scaledRectPadWidth + 2 * soldermaskMargin
      const maskHeight = scaledRectPadHeight + 2 * soldermaskMargin
      const maskBorderRadius = scaledRectBorderRadius + soldermaskMargin
      children.push({
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-solder-mask",
          fill: solderMaskColor,
          x: (-maskWidth / 2).toString(),
          y: (-maskHeight / 2).toString(),
          width: maskWidth.toString(),
          height: maskHeight.toString(),
          transform: `translate(${x} ${y}) rotate(${-rotatedHole.rect_ccw_rotation})`,
          ...(scaledRectBorderRadius
            ? {
                rx: maskBorderRadius.toString(),
                ry: maskBorderRadius.toString(),
              }
            : {}),
          "data-type": "pcb_soldermask",
        },
        value: "",
        children: [],
      })
    }

    return [
      {
        name: "g",
        type: "element",
        attributes: {
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
        },
        children,
        value: "",
      },
    ]
  }

  if (hole.shape === "hole_with_polygon_pad") {
    const polygonHole = hole
    const padOutline = polygonHole.pad_outline || []
    const holeX = polygonHole.x ?? 0
    const holeY = polygonHole.y ?? 0

    // Transform polygon pad outline points
    const padPoints = padOutline.map((point: { x: number; y: number }) =>
      applyToPoint(transform, [holeX + point.x, holeY + point.y]),
    )
    const padPointsString = padPoints
      .map((p: number[]) => p.join(","))
      .join(" ")

    // Calculate hole position with offset
    const [holeCenterX, holeCenterY] = applyToPoint(transform, [
      holeX + polygonHole.hole_offset_x,
      holeY + polygonHole.hole_offset_y,
    ])

    // Helper function to create hole SVG object based on hole_shape
    const createHoleSvgObject = (): SvgObject => {
      if (polygonHole.hole_shape === "circle") {
        const scaledDiameter =
          (polygonHole.hole_diameter ?? 0) * Math.abs(transform.a)
        const radius = scaledDiameter / 2
        return {
          name: "circle",
          type: "element",
          attributes: {
            class: "pcb-hole-inner",
            fill: colorMap.drill,
            cx: holeCenterX.toString(),
            cy: holeCenterY.toString(),
            r: radius.toString(),
            "data-type": "pcb_plated_hole_drill",
            "data-pcb-layer": "drill",
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
            class: "pcb-hole-inner",
            fill: colorMap.drill,
            cx: holeCenterX.toString(),
            cy: holeCenterY.toString(),
            rx: rx.toString(),
            ry: ry.toString(),
            "data-type": "pcb_plated_hole_drill",
            "data-pcb-layer": "drill",
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

        // Create pill path (same logic as regular pill holes)
        const isHorizontal = scaledWidth > scaledHeight
        const radius = Math.min(scaledWidth, scaledHeight) / 2
        const straightLength = Math.abs(
          isHorizontal
            ? scaledWidth - scaledHeight
            : scaledHeight - scaledWidth,
        )

        const pathD = isHorizontal
          ? `M${-straightLength / 2},${-radius} ` +
            `h${straightLength} ` +
            `a${radius},${radius} 0 0 1 0,${scaledHeight} ` +
            `h-${straightLength} ` +
            `a${radius},${radius} 0 0 1 0,-${scaledHeight} z`
          : `M${-radius},${-straightLength / 2} ` +
            `v${straightLength} ` +
            `a${radius},${radius} 0 0 0 ${scaledWidth},0 ` +
            `v-${straightLength} ` +
            `a${radius},${radius} 0 0 0 -${scaledWidth},0 z`

        return {
          name: "path",
          type: "element",
          attributes: {
            class: "pcb-hole-inner",
            fill: colorMap.drill,
            d: pathD,
            transform: `translate(${holeCenterX} ${holeCenterY})`,
            "data-type": "pcb_plated_hole_drill",
            "data-pcb-layer": "drill",
          },
          value: "",
          children: [],
        }
      }

      // Fallback: return empty object (should not happen)
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
          "data-type": "pcb_plated_hole",
          "data-pcb-layer": "through",
        },
        children: [
          // Polygon pad (outer shape)
          {
            name: "polygon",
            type: "element",
            attributes: {
              class: "pcb-hole-outer-pad",
              fill: colorMap.copper.top,
              points: padPointsString,
              "data-type": "pcb_plated_hole",
              "data-pcb-layer": copperLayer,
            },
            value: "",
            children: [],
          },
          // Hole inside the polygon (with offset)
          createHoleSvgObject(),
        ],
        value: "",
      },
    ]
  }

  return []
}
