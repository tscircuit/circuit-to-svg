import type { PCBHole } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbHole(
  hole: PCBHole,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap, showSolderMask } = ctx
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])

  const isCoveredWithSolderMask = Boolean(hole.is_covered_with_solder_mask)

  // Positive margin: mask extends beyond hole (less hole exposed)
  // Negative margin: mask is smaller than hole (spacing around edges)
  const soldermaskMargin = (hole.soldermask_margin ?? 0) * Math.abs(transform.a)

  // Show soldermask if it's enabled, the hole is covered, and there's a margin defined
  const shouldShowSolderMask =
    showSolderMask && isCoveredWithSolderMask && soldermaskMargin !== 0

  const solderMaskColor = colorMap.soldermask.top

  if (hole.hole_shape === "circle" || hole.hole_shape === "square") {
    const scaledDiameter = hole.hole_diameter * Math.abs(transform.a)
    const radius = scaledDiameter / 2

    if (hole.hole_shape === "circle") {
      const holeElement: SvgObject = {
        name: "circle",
        type: "element",
        attributes: {
          class: "pcb-hole",
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
          fill: colorMap.drill,
          "data-type": "pcb_hole",
          "data-pcb-layer": "drill",
        },
        children: [],
        value: "",
      }

      if (!shouldShowSolderMask) {
        return [holeElement]
      }

      const maskRadius = radius + soldermaskMargin

      const maskElement: SvgObject = {
        name: holeElement.name,
        type: holeElement.type,
        value: "",
        children: [],
        attributes: {
          ...holeElement.attributes,
          class: "pcb-solder-mask",
          fill: solderMaskColor,
          "data-type": "pcb_soldermask",
          r: maskRadius.toString(),
        },
      }

      return [holeElement, maskElement]
    }
    // Square hole
    const holeElement: SvgObject = {
      name: "rect",
      type: "element",
      attributes: {
        class: "pcb-hole",
        x: (x - radius).toString(),
        y: (y - radius).toString(),
        width: scaledDiameter.toString(),
        height: scaledDiameter.toString(),
        fill: colorMap.drill,
        "data-type": "pcb_hole",
        "data-pcb-layer": "drill",
      },
      children: [],
      value: "",
    }

    if (!shouldShowSolderMask) {
      return [holeElement]
    }

    const maskDiameter = scaledDiameter + 2 * soldermaskMargin

    const maskElement: SvgObject = {
      name: holeElement.name,
      type: holeElement.type,
      value: "",
      children: [],
      attributes: {
        ...holeElement.attributes,
        class: "pcb-solder-mask",
        fill: solderMaskColor,
        "data-type": "pcb_soldermask",
        x: (x - maskDiameter / 2).toString(),
        y: (y - maskDiameter / 2).toString(),
        width: maskDiameter.toString(),
        height: maskDiameter.toString(),
      },
    }

    return [holeElement, maskElement]
  }
  if (hole.hole_shape === "oval") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHeight = hole.hole_height * Math.abs(transform.a)
    const rx = scaledWidth / 2
    const ry = scaledHeight / 2

    const holeElement: SvgObject = {
      name: "ellipse",
      type: "element",
      attributes: {
        class: "pcb-hole",
        cx: x.toString(),
        cy: y.toString(),
        rx: rx.toString(),
        ry: ry.toString(),
        fill: colorMap.drill,
        "data-type": "pcb_hole",
        "data-pcb-layer": "drill",
      },
      children: [],
      value: "",
    }

    if (!shouldShowSolderMask) {
      return [holeElement]
    }

    const maskRx = rx + soldermaskMargin
    const maskRy = ry + soldermaskMargin

    const maskElement: SvgObject = {
      name: holeElement.name,
      type: holeElement.type,
      value: "",
      children: [],
      attributes: {
        ...holeElement.attributes,
        class: "pcb-solder-mask",
        fill: solderMaskColor,
        "data-type": "pcb_soldermask",
        rx: maskRx.toString(),
        ry: maskRy.toString(),
      },
    }

    return [holeElement, maskElement]
  }

  if (hole.hole_shape === "rect") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHeight = hole.hole_height * Math.abs(transform.a)

    const holeElement: SvgObject = {
      name: "rect",
      type: "element",
      attributes: {
        class: "pcb-hole",
        x: (x - scaledWidth / 2).toString(),
        y: (y - scaledHeight / 2).toString(),
        width: scaledWidth.toString(),
        height: scaledHeight.toString(),
        fill: colorMap.drill,
        "data-type": "pcb_hole",
        "data-pcb-layer": "drill",
      },
      children: [],
      value: "",
    }

    if (!shouldShowSolderMask) {
      return [holeElement]
    }

    const maskWidth = scaledWidth + 2 * soldermaskMargin
    const maskHeight = scaledHeight + 2 * soldermaskMargin

    const maskElement: SvgObject = {
      name: holeElement.name,
      type: holeElement.type,
      value: "",
      children: [],
      attributes: {
        ...holeElement.attributes,
        class: "pcb-solder-mask",
        fill: solderMaskColor,
        "data-type": "pcb_soldermask",
        x: (x - maskWidth / 2).toString(),
        y: (y - maskHeight / 2).toString(),
        width: maskWidth.toString(),
        height: maskHeight.toString(),
      },
    }

    return [holeElement, maskElement]
  }

  if (hole.hole_shape === "pill") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHeight = hole.hole_height * Math.abs(transform.a)

    // Pill shape: two semicircles connected by straight lines
    // If width > height, it's a horizontal pill; if height > width, it's vertical
    const isHorizontal = scaledWidth > scaledHeight
    const radius = Math.min(scaledWidth, scaledHeight) / 2
    const straightLength = Math.abs(
      isHorizontal ? scaledWidth - scaledHeight : scaledHeight - scaledWidth,
    )

    const pathD = isHorizontal
      ? // Horizontal pill (wider than tall)
        `M${x - straightLength / 2},${y - radius} ` +
        `h${straightLength} ` +
        `a${radius},${radius} 0 0 1 0,${scaledHeight} ` +
        `h-${straightLength} ` +
        `a${radius},${radius} 0 0 1 0,-${scaledHeight} z`
      : // Vertical pill (taller than wide)
        `M${x - radius},${y - straightLength / 2} ` +
        `v${straightLength} ` +
        `a${radius},${radius} 0 0 0 ${scaledWidth},0 ` +
        `v-${straightLength} ` +
        `a${radius},${radius} 0 0 0 -${scaledWidth},0 z`

    const holeElement: SvgObject = {
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-hole",
        fill: colorMap.drill,
        d: pathD,
        "data-type": "pcb_hole",
        "data-pcb-layer": "drill",
      },
      children: [],
      value: "",
    }

    if (!shouldShowSolderMask) {
      return [holeElement]
    }

    const maskWidth = scaledWidth + 2 * soldermaskMargin
    const maskHeight = scaledHeight + 2 * soldermaskMargin
    const maskIsHorizontal = maskWidth > maskHeight
    const maskRadius = Math.min(maskWidth, maskHeight) / 2
    const maskStraightLength = Math.abs(
      maskIsHorizontal ? maskWidth - maskHeight : maskHeight - maskWidth,
    )

    const maskPathD = maskIsHorizontal
      ? // Horizontal pill (wider than tall)
        `M${x - maskStraightLength / 2},${y - maskRadius} ` +
        `h${maskStraightLength} ` +
        `a${maskRadius},${maskRadius} 0 0 1 0,${maskHeight} ` +
        `h-${maskStraightLength} ` +
        `a${maskRadius},${maskRadius} 0 0 1 0,-${maskHeight} z`
      : // Vertical pill (taller than wide)
        `M${x - maskRadius},${y - maskStraightLength / 2} ` +
        `v${maskStraightLength} ` +
        `a${maskRadius},${maskRadius} 0 0 0 ${maskWidth},0 ` +
        `v-${maskStraightLength} ` +
        `a${maskRadius},${maskRadius} 0 0 0 -${maskWidth},0 z`

    const maskElement: SvgObject = {
      name: holeElement.name,
      type: holeElement.type,
      value: "",
      children: [],
      attributes: {
        ...holeElement.attributes,
        class: "pcb-solder-mask",
        fill: solderMaskColor,
        "data-type": "pcb_soldermask",
        d: maskPathD,
      },
    }

    return [holeElement, maskElement]
  }

  if (hole.hole_shape === "rotated_pill") {
    const scaledWidth = hole.hole_width * Math.abs(transform.a)
    const scaledHeight = hole.hole_height * Math.abs(transform.a)

    // PcbHoleRotatedPill uses ccw_rotation (not hole_ccw_rotation like plated holes)
    const rotation = "ccw_rotation" in hole ? (hole.ccw_rotation ?? 0) : 0

    // Same logic as regular pill: handle horizontal and vertical orientations
    const isHorizontal = scaledWidth > scaledHeight
    const radius = Math.min(scaledWidth, scaledHeight) / 2
    const straightLength = Math.abs(
      isHorizontal ? scaledWidth - scaledHeight : scaledHeight - scaledWidth,
    )

    const pathD = isHorizontal
      ? // Horizontal pill (wider than tall)
        `M${-straightLength / 2},${-radius} ` +
        `h${straightLength} ` +
        `a${radius},${radius} 0 0 1 0,${scaledHeight} ` +
        `h-${straightLength} ` +
        `a${radius},${radius} 0 0 1 0,-${scaledHeight} z`
      : // Vertical pill (taller than wide)
        `M${-radius},${-straightLength / 2} ` +
        `v${straightLength} ` +
        `a${radius},${radius} 0 0 0 ${scaledWidth},0 ` +
        `v-${straightLength} ` +
        `a${radius},${radius} 0 0 0 -${scaledWidth},0 z`

    const holeElement: SvgObject = {
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-hole",
        fill: colorMap.drill,
        d: pathD,
        transform: `translate(${x} ${y}) rotate(${-rotation})`,
        "data-type": "pcb_hole",
        "data-pcb-layer": "drill",
      },
      children: [],
      value: "",
    }

    if (!shouldShowSolderMask) {
      return [holeElement]
    }

    const maskWidth = scaledWidth + 2 * soldermaskMargin
    const maskHeight = scaledHeight + 2 * soldermaskMargin
    const maskIsHorizontal = maskWidth > maskHeight
    const maskRadius = Math.min(maskWidth, maskHeight) / 2
    const maskStraightLength = Math.abs(
      maskIsHorizontal ? maskWidth - maskHeight : maskHeight - maskWidth,
    )

    const maskPathD = maskIsHorizontal
      ? // Horizontal pill (wider than tall)
        `M${-maskStraightLength / 2},${-maskRadius} ` +
        `h${maskStraightLength} ` +
        `a${maskRadius},${maskRadius} 0 0 1 0,${maskHeight} ` +
        `h-${maskStraightLength} ` +
        `a${maskRadius},${maskRadius} 0 0 1 0,-${maskHeight} z`
      : // Vertical pill (taller than wide)
        `M${-maskRadius},${-maskStraightLength / 2} ` +
        `v${maskStraightLength} ` +
        `a${maskRadius},${maskRadius} 0 0 0 ${maskWidth},0 ` +
        `v-${maskStraightLength} ` +
        `a${maskRadius},${maskRadius} 0 0 0 -${maskWidth},0 z`

    const maskElement: SvgObject = {
      name: holeElement.name,
      type: holeElement.type,
      value: "",
      children: [],
      attributes: {
        ...holeElement.attributes,
        class: "pcb-solder-mask",
        fill: solderMaskColor,
        "data-type": "pcb_soldermask",
        d: maskPathD,
      },
    }

    return [holeElement, maskElement]
  }

  return []
}
