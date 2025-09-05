import type { PcbCopperPour } from "circuit-json"
import {
  applyToPoint,
  compose,
  rotate,
  toString as matrixToString,
  translate,
} from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCopperPour(
  pour: PcbCopperPour,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const { layer } = pour

  if (layerFilter && layer !== layerFilter) return []

  const color = layerNameToColor(layer, colorMap)
  const opacity = "0.5"

  if (pour.shape === "rect") {
    const [cx, cy] = applyToPoint(transform, [pour.center.x, pour.center.y])
    const scaledWidth = pour.width * Math.abs(transform.a)
    const scaledHeight = pour.height * Math.abs(transform.d)
    const svgRotation = -(pour.rotation ?? 0)

    return [
      {
        name: "rect",
        type: "element",
        attributes: {
          class: "pcb-copper-pour pcb-copper-pour-rect",
          x: (-scaledWidth / 2).toString(),
          y: (-scaledHeight / 2).toString(),
          width: scaledWidth.toString(),
          height: scaledHeight.toString(),
          fill: color,
          "fill-opacity": opacity,
          transform: matrixToString(
            compose(translate(cx, cy), rotate((svgRotation * Math.PI) / 180)),
          ),
          "data-layer": layer,
        },
        children: [],
        value: "",
      },
    ]
  }

  if (pour.shape === "polygon") {
    if (!pour.points || pour.points.length === 0) return []

    const transformedPoints = pour.points.map((p) =>
      applyToPoint(transform, [p.x, p.y]),
    )
    const pointsString = transformedPoints
      .map((p) => `${p[0]},${p[1]}`)
      .join(" ")

    return [
      {
        name: "polygon",
        type: "element",
        attributes: {
          class: "pcb-copper-pour pcb-copper-pour-polygon",
          points: pointsString,
          fill: color,
          "fill-opacity": opacity,
          "data-layer": layer,
        },
        children: [],
        value: "",
      },
    ]
  }

  return []
}
