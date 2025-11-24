import type { PcbSmtPad } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromSmtPad(
  pad: PcbSmtPad,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, showSolderMask } = ctx
  if (layerFilter && pad.layer !== layerFilter) return []

  const isCoveredWithSolderMask = Boolean(pad?.is_covered_with_solder_mask)
  const shouldshowSolderMask = showSolderMask && isCoveredWithSolderMask

  const soldermaskWithCopperUnderneathColor =
    colorMap.soldermaskWithCopperUnderneath[
      pad.layer as keyof typeof colorMap.soldermaskWithCopperUnderneath
    ] ?? colorMap.soldermaskWithCopperUnderneath.top

  // Positive margin: mask extends beyond pad (less copper exposed)
  // Negative margin: mask is smaller than pad (spacing/copper visible around edges)
  const soldermaskMargin = (pad.soldermask_margin ?? 0) * Math.abs(transform.a)

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])
    const cornerRadiusValue =
      (pad as { corner_radius?: number }).corner_radius ??
      pad.rect_border_radius ??
      0
    const scaledBorderRadius = cornerRadiusValue * Math.abs(transform.a)

    if (pad.shape === "rotated_rect" && pad.ccw_rotation) {
      const padElement: SvgObject = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad",
          fill: layerNameToColor(pad.layer, colorMap),
          x: (-width / 2).toString(),
          y: (-height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
          ...(scaledBorderRadius
            ? {
                rx: scaledBorderRadius.toString(),
                ry: scaledBorderRadius.toString(),
              }
            : {}),
        },
      }

      if (!shouldshowSolderMask) {
        return [padElement]
      }

      const maskWidth = width + 2 * soldermaskMargin
      const maskHeight = height + 2 * soldermaskMargin
      const maskBorderRadius = scaledBorderRadius
        ? scaledBorderRadius + soldermaskMargin
        : 0

      // For negative margins, create a ring effect
      if (soldermaskMargin < 0) {
        const coveredPadElement: SvgObject = {
          name: "rect",
          type: "element",
          value: "",
          children: [],
          attributes: {
            class: "pcb-pad-covered",
            fill: soldermaskWithCopperUnderneathColor,
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            width: width.toString(),
            height: height.toString(),
            transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
            "data-type": "pcb_smtpad",
            "data-pcb-layer": pad.layer,
            ...(scaledBorderRadius
              ? {
                  rx: scaledBorderRadius.toString(),
                  ry: scaledBorderRadius.toString(),
                }
              : {}),
          },
        }

        const exposedOpeningElement: SvgObject = {
          name: "rect",
          type: "element",
          value: "",
          children: [],
          attributes: {
            class: "pcb-pad-exposed",
            fill: layerNameToColor(pad.layer, colorMap),
            x: (-maskWidth / 2).toString(),
            y: (-maskHeight / 2).toString(),
            width: maskWidth.toString(),
            height: maskHeight.toString(),
            transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
            "data-type": "pcb_soldermask",
            "data-pcb-layer": pad.layer,
            ...(maskBorderRadius > 0
              ? {
                  rx: maskBorderRadius.toString(),
                  ry: maskBorderRadius.toString(),
                }
              : {}),
          },
        }

        return [coveredPadElement, exposedOpeningElement]
      }

      // For zero margin, pad is fully covered with soldermask
      if (soldermaskMargin === 0) {
        const coveredPadElement: SvgObject = {
          name: "rect",
          type: "element",
          value: "",
          children: [],
          attributes: {
            class: "pcb-pad-covered",
            fill: soldermaskWithCopperUnderneathColor,
            x: (-width / 2).toString(),
            y: (-height / 2).toString(),
            width: width.toString(),
            height: height.toString(),
            transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
            "data-type": "pcb_smtpad",
            "data-pcb-layer": pad.layer,
            ...(scaledBorderRadius
              ? {
                  rx: scaledBorderRadius.toString(),
                  ry: scaledBorderRadius.toString(),
                }
              : {}),
          },
        }

        return [coveredPadElement]
      }

      // For positive margins, draw substrate cutout then pad on top
      const substrateElement: SvgObject = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-soldermask-cutout",
          fill: colorMap.substrate,
          x: (-maskWidth / 2).toString(),
          y: (-maskHeight / 2).toString(),
          width: maskWidth.toString(),
          height: maskHeight.toString(),
          transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
          ...(maskBorderRadius > 0
            ? {
                rx: maskBorderRadius.toString(),
                ry: maskBorderRadius.toString(),
              }
            : {}),
          "data-type": "pcb_soldermask_opening",
          "data-pcb-layer": `soldermask-${pad.layer}`,
        },
      }

      return [substrateElement, padElement]
    }

    const padElement: SvgObject = {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-pad",
        fill: layerNameToColor(pad.layer, colorMap),
        x: (x - width / 2).toString(),
        y: (y - height / 2).toString(),
        width: width.toString(),
        height: height.toString(),
        "data-type": "pcb_smtpad",
        "data-pcb-layer": pad.layer,
        ...(scaledBorderRadius
          ? {
              rx: scaledBorderRadius.toString(),
              ry: scaledBorderRadius.toString(),
            }
          : {}),
      },
    }

    if (!shouldshowSolderMask) {
      return [padElement]
    }

    // Apply soldermask margin to dimensions
    const maskWidth = width + 2 * soldermaskMargin
    const maskHeight = height + 2 * soldermaskMargin
    const maskBorderRadius = scaledBorderRadius
      ? scaledBorderRadius + soldermaskMargin
      : 0

    // For negative margins, create a ring effect where soldermask covers only the edges
    if (soldermaskMargin < 0) {
      // Draw the pad in soldermask color (covered)
      const coveredPadElement: SvgObject = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
          ...(scaledBorderRadius
            ? {
                rx: scaledBorderRadius.toString(),
                ry: scaledBorderRadius.toString(),
              }
            : {}),
        },
      }

      // Draw the exposed opening in copper color
      const exposedOpeningElement: SvgObject = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-exposed",
          fill: layerNameToColor(pad.layer, colorMap),
          x: (x - maskWidth / 2).toString(),
          y: (y - maskHeight / 2).toString(),
          width: maskWidth.toString(),
          height: maskHeight.toString(),
          "data-type": "pcb_soldermask",
          "data-pcb-layer": pad.layer,
          ...(maskBorderRadius > 0
            ? {
                rx: maskBorderRadius.toString(),
                ry: maskBorderRadius.toString(),
              }
            : {}),
        },
      }

      return [coveredPadElement, exposedOpeningElement]
    }

    // For zero margin, pad is fully covered with soldermask
    if (soldermaskMargin === 0) {
      const coveredPadElement: SvgObject = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          ...(maskBorderRadius > 0
            ? {
                rx: scaledBorderRadius.toString(),
                ry: scaledBorderRadius.toString(),
              }
            : {}),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
        },
      }

      return [coveredPadElement]
    }

    // For positive margins, draw substrate cutout (soldermask opening) then pad on top
    const substrateElement: SvgObject = {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap.substrate,
        x: (x - maskWidth / 2).toString(),
        y: (y - maskHeight / 2).toString(),
        width: maskWidth.toString(),
        height: maskHeight.toString(),
        ...(maskBorderRadius > 0
          ? {
              rx: maskBorderRadius.toString(),
              ry: maskBorderRadius.toString(),
            }
          : {}),
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": `soldermask-${pad.layer}`,
      },
    }

    return [substrateElement, padElement]
  }

  if (pad.shape === "pill") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const radius = pad.radius * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    const padElement: SvgObject = {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-pad",
        fill: layerNameToColor(pad.layer, colorMap),
        x: (x - width / 2).toString(),
        y: (y - height / 2).toString(),
        width: width.toString(),
        height: height.toString(),
        rx: radius.toString(),
        ry: radius.toString(),
        "data-type": "pcb_smtpad",
        "data-pcb-layer": pad.layer,
      },
    }

    if (!shouldshowSolderMask) {
      return [padElement]
    }

    // Apply soldermask margin to dimensions
    const maskWidth = width + 2 * soldermaskMargin
    const maskHeight = height + 2 * soldermaskMargin
    const maskRadius = radius + soldermaskMargin

    // For negative margins, create a ring effect
    if (soldermaskMargin < 0) {
      const coveredPadElement: SvgObject = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
          ry: radius.toString(),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
        },
      }

      const exposedOpeningElement: SvgObject = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-exposed",
          fill: layerNameToColor(pad.layer, colorMap),
          x: (x - maskWidth / 2).toString(),
          y: (y - maskHeight / 2).toString(),
          width: maskWidth.toString(),
          height: maskHeight.toString(),
          rx: maskRadius.toString(),
          ry: maskRadius.toString(),
          "data-type": "pcb_soldermask",
          "data-pcb-layer": pad.layer,
        },
      }

      return [coveredPadElement, exposedOpeningElement]
    }

    // For zero margin, pad is fully covered with soldermask
    if (soldermaskMargin === 0) {
      const coveredPadElement: SvgObject = {
        name: "rect",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          x: (x - width / 2).toString(),
          y: (y - height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          rx: radius.toString(),
          ry: radius.toString(),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
        },
      }

      return [coveredPadElement]
    }

    // For positive margins, draw substrate cutout then pad on top
    const substrateElement: SvgObject = {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap.substrate,
        x: (x - maskWidth / 2).toString(),
        y: (y - maskHeight / 2).toString(),
        width: maskWidth.toString(),
        height: maskHeight.toString(),
        rx: maskRadius.toString(),
        ry: maskRadius.toString(),
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": `soldermask-${pad.layer}`,
      },
    }

    return [substrateElement, padElement]
  }
  if (pad.shape === "circle") {
    const radius = pad.radius * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    const padElement: SvgObject = {
      name: "circle",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-pad",
        fill: layerNameToColor(pad.layer, colorMap),
        cx: x.toString(),
        cy: y.toString(),
        r: radius.toString(),
        "data-type": "pcb_smtpad",
        "data-pcb-layer": pad.layer,
      },
    }

    if (!shouldshowSolderMask) {
      return [padElement]
    }

    // Apply soldermask margin to radius
    const maskRadius = radius + soldermaskMargin

    // For negative margins, create a ring effect
    if (soldermaskMargin < 0) {
      const coveredPadElement: SvgObject = {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
        },
      }

      const exposedOpeningElement: SvgObject = {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-exposed",
          fill: layerNameToColor(pad.layer, colorMap),
          cx: x.toString(),
          cy: y.toString(),
          r: maskRadius.toString(),
          "data-type": "pcb_soldermask",
          "data-pcb-layer": pad.layer,
        },
      }

      return [coveredPadElement, exposedOpeningElement]
    }

    // For zero margin, pad is fully covered with soldermask
    if (soldermaskMargin === 0) {
      const coveredPadElement: SvgObject = {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          cx: x.toString(),
          cy: y.toString(),
          r: radius.toString(),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
        },
      }

      return [coveredPadElement]
    }

    // For positive margins, draw substrate cutout (soldermask opening) then pad on top
    const substrateElement: SvgObject = {
      name: "circle",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap.substrate,
        cx: x.toString(),
        cy: y.toString(),
        r: maskRadius.toString(),
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": `soldermask-${pad.layer}`,
      },
    }

    return [substrateElement, padElement]
  }

  if (pad.shape === "polygon") {
    const points = (pad.points ?? []).map((point) =>
      applyToPoint(transform, [point.x, point.y]),
    )

    const padElement: SvgObject = {
      name: "polygon",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-pad",
        fill: layerNameToColor(pad.layer, colorMap),
        points: points.map((p) => p.join(",")).join(" "),
        "data-type": "pcb_smtpad",
        "data-pcb-layer": pad.layer,
      },
    }

    if (!shouldshowSolderMask) {
      return [padElement]
    }

    // Apply soldermask margin to polygon by offsetting each point from centroid
    let maskPoints = points
    if (soldermaskMargin !== 0) {
      // Calculate centroid
      const centroidX = points.reduce((sum, p) => sum + p[0], 0) / points.length
      const centroidY = points.reduce((sum, p) => sum + p[1], 0) / points.length

      // Offset each point away from or toward the centroid
      maskPoints = points.map(([px, py]) => {
        const dx = px - centroidX
        const dy = py - centroidY
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance === 0) return [px, py]

        const normalizedDx = dx / distance
        const normalizedDy = dy / distance
        return [
          px + normalizedDx * soldermaskMargin,
          py + normalizedDy * soldermaskMargin,
        ]
      })
    }

    // For negative margins, create a ring effect
    if (soldermaskMargin < 0) {
      const coveredPadElement: SvgObject = {
        name: "polygon",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          points: points.map((p) => p.join(",")).join(" "),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
        },
      }

      const exposedOpeningElement: SvgObject = {
        name: "polygon",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-exposed",
          fill: layerNameToColor(pad.layer, colorMap),
          points: maskPoints.map((p) => p.join(",")).join(" "),
          "data-type": "pcb_soldermask",
          "data-pcb-layer": pad.layer,
        },
      }

      return [coveredPadElement, exposedOpeningElement]
    }

    // For zero margin, pad is fully covered with soldermask
    if (soldermaskMargin === 0) {
      const coveredPadElement: SvgObject = {
        name: "polygon",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-pad-covered",
          fill: soldermaskWithCopperUnderneathColor,
          points: points.map((p) => p.join(",")).join(" "),
          "data-type": "pcb_smtpad",
          "data-pcb-layer": pad.layer,
        },
      }

      return [coveredPadElement]
    }

    // For positive margins, draw substrate cutout then pad on top
    const substrateElement: SvgObject = {
      name: "polygon",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-soldermask-cutout",
        fill: colorMap.substrate,
        points: maskPoints.map((p) => p.join(",")).join(" "),
        "data-type": "pcb_soldermask_opening",
        "data-pcb-layer": `soldermask-${pad.layer}`,
      },
    }

    return [substrateElement, padElement]
  }

  // TODO: Implement SMT pad circles/ovals etc.
  return []
}
