import type { PcbSmtPad } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { solderPasteLayerNameToColor } from "../layer-name-to-color"
import { offsetPolygonOutline } from "../offset-polygon-outline"

type PcbSmtPadWithSolderPasteMargin = PcbSmtPad & {
  solderpaste_margin?: number
}

export const createSvgObjectsFromSmtPadSolderPaste = (
  pad: PcbSmtPadWithSolderPasteMargin,
  ctx: PcbContext,
): SvgObject[] => {
  const margin = pad.solderpaste_margin
  if (typeof margin !== "number") return []
  if (ctx.layer && pad.layer !== ctx.layer) return []

  const hasExplicitSolderPaste = ctx.circuitJson?.some(
    (element) =>
      element.type === "pcb_solder_paste" &&
      element.pcb_smtpad_id === pad.pcb_smtpad_id,
  )
  if (hasExplicitSolderPaste) return []

  const { transform } = ctx
  const fill = solderPasteLayerNameToColor(pad.layer)
  const commonAttributes = {
    class: "pcb-solder-paste",
    fill,
    "data-type": "pcb_solder_paste",
    "data-pcb-layer": pad.layer,
    "data-pcb-smtpad-id": pad.pcb_smtpad_id,
  }

  if (pad.shape === "polygon") {
    const points = offsetPolygonOutline(pad.points, margin).map((point) =>
      applyToPoint(transform, [point.x, point.y]),
    )
    if (points.length < 3) return []
    return [
      {
        name: "polygon",
        type: "element",
        value: "",
        children: [],
        attributes: {
          ...commonAttributes,
          points: points.map((point) => point.join(",")).join(" "),
        },
      },
    ]
  }

  const [x, y] = applyToPoint(transform, [pad.x, pad.y])
  if (pad.shape === "circle") {
    const radius = pad.radius + margin
    if (radius <= 0) return []
    return [
      {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          ...commonAttributes,
          cx: x.toString(),
          cy: y.toString(),
          r: (radius * Math.abs(transform.a)).toString(),
        },
      },
    ]
  }

  const width = pad.width + margin * 2
  const height = pad.height + margin * 2
  if (width <= 0 || height <= 0) return []

  const scaledWidth = width * Math.abs(transform.a)
  const scaledHeight = height * Math.abs(transform.d)
  const isRotated =
    (pad.shape === "rotated_rect" || pad.shape === "rotated_pill") &&
    pad.ccw_rotation !== 0
  const attributes: Record<string, string> = {
    ...commonAttributes,
    x: (isRotated ? -scaledWidth / 2 : x - scaledWidth / 2).toString(),
    y: (isRotated ? -scaledHeight / 2 : y - scaledHeight / 2).toString(),
    width: scaledWidth.toString(),
    height: scaledHeight.toString(),
  }

  if (isRotated) {
    attributes.transform = `translate(${x} ${y}) rotate(${-pad.ccw_rotation})`
  }

  if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    const radius = Math.max(
      0,
      Math.min(pad.radius + margin, width / 2, height / 2),
    )
    attributes.rx = (radius * Math.abs(transform.a)).toString()
  } else {
    const cornerRadius =
      "corner_radius" in pad && typeof pad.corner_radius === "number"
        ? Math.max(
            0,
            Math.min(pad.corner_radius + margin, width / 2, height / 2),
          )
        : 0
    if (cornerRadius > 0) {
      attributes.rx = (cornerRadius * Math.abs(transform.a)).toString()
      attributes.ry = (cornerRadius * Math.abs(transform.d)).toString()
    }
  }

  return [
    {
      name: "rect",
      type: "element",
      value: "",
      children: [],
      attributes,
    },
  ]
}
