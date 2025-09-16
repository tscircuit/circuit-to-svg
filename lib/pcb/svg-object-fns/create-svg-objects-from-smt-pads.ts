import type { PcbSmtPad } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromSmtPad(
  pad: PcbSmtPad,
  ctx: PcbContext,
): any {
  const { transform, layer: layerFilter, colorMap } = ctx

  if (layerFilter && pad.layer !== layerFilter) return []

  const isCoveredWithSolderMask = Boolean(pad?.is_covered_with_solder_mask)

  const solderMaskColor =
    colorMap.soldermask[pad.layer as keyof typeof colorMap.soldermask] ??
    colorMap.soldermask.top

  const createPadElements = (
    elementName: "rect" | "circle" | "polygon",
    geometry: Record<string, string>,
  ) => {
    const padElement = {
      name: elementName,
      type: "element",
      attributes: {
        ...geometry,
        class: "pcb-pad",
        fill: layerNameToColor(pad.layer, colorMap),
        "data-layer": pad.layer,
      },
    }

    if (!isCoveredWithSolderMask) {
      return [padElement]
    }

    return [
      padElement,
      {
        name: elementName,
        type: "element",
        attributes: {
          ...geometry,
          class: "pcb-solder-mask",
          fill: solderMaskColor,
          "data-layer": pad.layer,
        },
      },
    ]
  }

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])
    const scaledBorderRadius =
      (pad.rect_border_radius ?? 0) * Math.abs(transform.a)

    if (pad.shape === "rotated_rect" && pad.ccw_rotation) {
      return createPadElements("rect", {
        x: (-width / 2).toString(),
        y: (-height / 2).toString(),
        width: width.toString(),
        height: height.toString(),
        transform: `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`,
        ...(scaledBorderRadius
          ? {
              rx: scaledBorderRadius.toString(),
              ry: scaledBorderRadius.toString(),
            }
          : {}),
      })
    }

    return createPadElements("rect", {
      x: (x - width / 2).toString(),
      y: (y - height / 2).toString(),
      width: width.toString(),
      height: height.toString(),
      ...(scaledBorderRadius
        ? {
            rx: scaledBorderRadius.toString(),
            ry: scaledBorderRadius.toString(),
          }
        : {}),
    })
  }

  if (pad.shape === "pill") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const radius = pad.radius * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    return createPadElements("rect", {
      x: (x - width / 2).toString(),
      y: (y - height / 2).toString(),
      width: width.toString(),
      height: height.toString(),
      rx: radius.toString(),
      ry: radius.toString(),
    })
  }
  if (pad.shape === "circle") {
    const radius = pad.radius * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    return createPadElements("circle", {
      cx: x.toString(),
      cy: y.toString(),
      r: radius.toString(),
    })
  }

  if (pad.shape === "polygon") {
    const points = (pad.points ?? []).map((point) =>
      applyToPoint(transform, [point.x, point.y]),
    )

    return createPadElements("polygon", {
      points: points.map((p) => p.join(",")).join(" "),
    })
  }

  // TODO: Implement SMT pad circles/ovals etc.
  return []
}
