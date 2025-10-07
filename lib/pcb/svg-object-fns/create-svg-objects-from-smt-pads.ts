import type { PcbSmtPad } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromSmtPad(
  pad: PcbSmtPad,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, renderSolderMask } = ctx
  if (layerFilter && pad.layer !== layerFilter) return []

  const isCoveredWithSolderMask = Boolean(pad?.is_covered_with_solder_mask)
  const shouldRenderSolderMask = renderSolderMask && isCoveredWithSolderMask

  const solderMaskColor =
    colorMap.soldermask[pad.layer as keyof typeof colorMap.soldermask] ??
    colorMap.soldermask.top

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])
    const scaledBorderRadius =
      (pad.rect_border_radius ?? 0) * Math.abs(transform.a)

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
          "data-layer": pad.layer,
          ...(scaledBorderRadius
            ? {
                rx: scaledBorderRadius.toString(),
                ry: scaledBorderRadius.toString(),
              }
            : {}),
        },
      }

      if (!shouldRenderSolderMask) {
        return [padElement]
      }

      const maskElement: SvgObject = {
        name: padElement.name,
        type: padElement.type,
        value: "",
        children: [],
        attributes: {
          ...padElement.attributes,
          class: "pcb-solder-mask",
          fill: solderMaskColor,
        },
      }

      return [padElement, maskElement]
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
        "data-layer": pad.layer,
        ...(scaledBorderRadius
          ? {
              rx: scaledBorderRadius.toString(),
              ry: scaledBorderRadius.toString(),
            }
          : {}),
      },
    }

    if (!shouldRenderSolderMask) {
      return [padElement]
    }

    const maskElement: SvgObject = {
      name: padElement.name,
      type: padElement.type,
      value: "",
      children: [],
      attributes: {
        ...padElement.attributes,
        class: "pcb-solder-mask",
        fill: solderMaskColor,
      },
    }

    return [padElement, maskElement]
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
        "data-layer": pad.layer,
      },
    }

    if (!shouldRenderSolderMask) {
      return [padElement]
    }

    const maskElement: SvgObject = {
      name: padElement.name,
      type: padElement.type,
      value: "",
      children: [],
      attributes: {
        ...padElement.attributes,
        class: "pcb-solder-mask",
        fill: solderMaskColor,
      },
    }

    return [padElement, maskElement]
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
        "data-layer": pad.layer,
      },
    }

    if (!shouldRenderSolderMask) {
      return [padElement]
    }

    const maskElement: SvgObject = {
      name: padElement.name,
      type: padElement.type,
      value: "",
      children: [],
      attributes: {
        ...padElement.attributes,
        class: "pcb-solder-mask",
        fill: solderMaskColor,
      },
    }

    return [padElement, maskElement]
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
        "data-layer": pad.layer,
      },
    }

    if (!shouldRenderSolderMask) {
      return [padElement]
    }

    const maskElement: SvgObject = {
      name: padElement.name,
      type: padElement.type,
      value: "",
      children: [],
      attributes: {
        ...padElement.attributes,
        class: "pcb-solder-mask",
        fill: solderMaskColor,
      },
    }

    return [padElement, maskElement]
  }

  // TODO: Implement SMT pad circles/ovals etc.
  return []
}
