import type { PcbSmtPad } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

const toNumeric = (value: number | string | null | undefined) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

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
    const padX = toNumeric(pad.x) ?? 0
    const padY = toNumeric(pad.y) ?? 0
    const widthValue = toNumeric(pad.width) ?? 0
    const heightValue = toNumeric(pad.height) ?? 0
    const width = widthValue * Math.abs(transform.a)
    const height = heightValue * Math.abs(transform.d)
    const [x, y] = applyToPoint(transform, [padX, padY])
    const cornerRadiusValue =
      toNumeric((pad as { corner_radius?: number | string }).corner_radius) ??
      toNumeric(pad.rect_border_radius) ??
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
          "data-type": "pcb_soldermask",
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
        "data-type": "pcb_soldermask",
      },
    }

    return [padElement, maskElement]
  }

  if (pad.shape === "pill") {
    const padX = toNumeric(pad.x) ?? 0
    const padY = toNumeric(pad.y) ?? 0
    const widthValue = toNumeric(pad.width) ?? 0
    const heightValue = toNumeric(pad.height) ?? 0
    const radiusValue = toNumeric(pad.radius) ?? 0
    const width = widthValue * Math.abs(transform.a)
    const height = heightValue * Math.abs(transform.d)
    const radius = radiusValue * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [padX, padY])

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
        "data-type": "pcb_soldermask",
      },
    }

    return [padElement, maskElement]
  }
  if (pad.shape === "circle") {
    const padX = toNumeric(pad.x) ?? 0
    const padY = toNumeric(pad.y) ?? 0
    const radiusValue = toNumeric(pad.radius) ?? 0
    const radius = radiusValue * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [padX, padY])

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
        "data-type": "pcb_soldermask",
      },
    }

    return [padElement, maskElement]
  }

  if (pad.shape === "polygon") {
    const points = (pad.points ?? []).map((point) => {
      const pointX = toNumeric(point.x) ?? 0
      const pointY = toNumeric(point.y) ?? 0
      return applyToPoint(transform, [pointX, pointY])
    })

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
        "data-type": "pcb_soldermask",
      },
    }

    return [padElement, maskElement]
  }

  // TODO: Implement SMT pad circles/ovals etc.
  return []
}
