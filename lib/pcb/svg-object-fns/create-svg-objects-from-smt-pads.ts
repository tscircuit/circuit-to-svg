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

  const isCoveredWithSolderMask = Boolean(
    (pad as any)?.is_covered_with_solder_mask,
  )

  const solderMaskColor =
    colorMap.soldermask[pad.layer as keyof typeof colorMap.soldermask] ??
    colorMap.soldermask.top

  const maybeCreateSolderMask = (geometry: Record<string, string>) => {
    if (!isCoveredWithSolderMask) return null
    return {
      ...geometry,
      class: "pcb-solder-mask",
      fill: solderMaskColor,
      "data-layer": pad.layer,
    }
  }

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])
    const scaledBorderRadius =
      ((pad as any).rect_border_radius ?? 0) * Math.abs(transform.a)

    if (pad.shape === "rotated_rect" && pad.ccw_rotation) {
      const geometry = {
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
      }

      const padAttributes = {
        ...geometry,
        class: "pcb-pad",
        fill: layerNameToColor(pad.layer, colorMap),
        "data-layer": pad.layer,
      }

      const maskAttributes = maybeCreateSolderMask(geometry)

      return [
        {
          name: "rect",
          type: "element",
          attributes: padAttributes,
        },
        ...(maskAttributes
          ? [
              {
                name: "rect",
                type: "element",
                attributes: maskAttributes,
              },
            ]
          : []),
      ]
    }

    const geometry = {
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
    }

    const padAttributes = {
      ...geometry,
      class: "pcb-pad",
      fill: layerNameToColor(pad.layer, colorMap),
      "data-layer": pad.layer,
    }

    const maskAttributes = maybeCreateSolderMask(geometry)

    return [
      {
        name: "rect",
        type: "element",
        attributes: padAttributes,
      },
      ...(maskAttributes
        ? [
            {
              name: "rect",
              type: "element",
              attributes: maskAttributes,
            },
          ]
        : []),
    ]
  }

  if (pad.shape === "pill") {
    const width = pad.width * Math.abs(transform.a)
    const height = pad.height * Math.abs(transform.d)
    const radius = pad.radius * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    const geometry = {
      x: (x - width / 2).toString(),
      y: (y - height / 2).toString(),
      width: width.toString(),
      height: height.toString(),
      rx: radius.toString(),
      ry: radius.toString(),
    }

    const padAttributes = {
      ...geometry,
      class: "pcb-pad",
      fill: layerNameToColor(pad.layer, colorMap),
      "data-layer": pad.layer,
    }

    const maskAttributes = maybeCreateSolderMask(geometry)

    return [
      {
        name: "rect",
        type: "element",
        attributes: padAttributes,
      },
      ...(maskAttributes
        ? [
            {
              name: "rect",
              type: "element",
              attributes: maskAttributes,
            },
          ]
        : []),
    ]
  }
  if (pad.shape === "circle") {
    const radius = pad.radius * Math.abs(transform.a)
    const [x, y] = applyToPoint(transform, [pad.x, pad.y])

    const geometry = {
      cx: x.toString(),
      cy: y.toString(),
      r: radius.toString(),
    }

    const padAttributes = {
      ...geometry,
      class: "pcb-pad",
      fill: layerNameToColor(pad.layer, colorMap),
      "data-layer": pad.layer,
    }

    const maskAttributes = maybeCreateSolderMask(geometry)

    return [
      {
        name: "circle",
        type: "element",
        attributes: padAttributes,
      },
      ...(maskAttributes
        ? [
            {
              name: "circle",
              type: "element",
              attributes: maskAttributes,
            },
          ]
        : []),
    ]
  }

  if (pad.shape === "polygon") {
    const points = (pad.points ?? []).map((point) =>
      applyToPoint(transform, [point.x, point.y]),
    )

    const pointsString = points.map((p) => p.join(",")).join(" ")

    const padAttributes = {
      points: pointsString,
      class: "pcb-pad",
      fill: layerNameToColor(pad.layer, colorMap),
      "data-layer": pad.layer,
    }

    const maskAttributes = maybeCreateSolderMask({ points: pointsString })

    return [
      {
        name: "polygon",
        type: "element",
        attributes: padAttributes,
      },
      ...(maskAttributes
        ? [
            {
              name: "polygon",
              type: "element",
              attributes: maskAttributes,
            },
          ]
        : []),
    ]
  }

  // TODO: Implement SMT pad circles/ovals etc.
  return []
}
