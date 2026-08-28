import type { PcbSoldermaskOpening } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { createSoldermaskCutoutElement } from "./create-soldermask-cutout-element"

export function createSvgObjectsFromPcbSoldermaskOpening(
  opening: PcbSoldermaskOpening,
  context: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = context
  if (layerFilter && opening.layer !== layerFilter) return []

  if (opening.shape === "polygon") {
    const points = opening.points
      .map((point) => applyToPoint(transform, [point.x, point.y]))
      .map(([x, y]) => `${x},${y}`)
      .join(" ")
    return [
      createSoldermaskCutoutElement({
        elementType: "polygon",
        shapeAttributes: { points },
        layer: opening.layer,
        colorMap,
      }),
    ]
  }

  const [x, y] = applyToPoint(transform, [opening.x, opening.y])
  if (opening.shape === "circle") {
    return [
      createSoldermaskCutoutElement({
        elementType: "circle",
        shapeAttributes: {
          cx: x.toString(),
          cy: y.toString(),
          r: (opening.radius * Math.abs(transform.a)).toString(),
        },
        layer: opening.layer,
        colorMap,
      }),
    ]
  }

  const width = opening.width * Math.abs(transform.a)
  const height = opening.height * Math.abs(transform.d)
  if (opening.shape === "rotated_rect") {
    return [
      createSoldermaskCutoutElement({
        elementType: "rect",
        shapeAttributes: {
          x: (-width / 2).toString(),
          y: (-height / 2).toString(),
          width: width.toString(),
          height: height.toString(),
          transform: `translate(${x} ${y}) rotate(${-opening.ccw_rotation})`,
        },
        layer: opening.layer,
        colorMap,
      }),
    ]
  }

  return [
    createSoldermaskCutoutElement({
      elementType: "rect",
      shapeAttributes: {
        x: (x - width / 2).toString(),
        y: (y - height / 2).toString(),
        width: width.toString(),
        height: height.toString(),
      },
      layer: opening.layer,
      colorMap,
    }),
  ]
}
