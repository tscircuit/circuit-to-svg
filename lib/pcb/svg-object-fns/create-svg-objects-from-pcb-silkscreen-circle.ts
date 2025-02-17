import type { PcbSilkscreenCircle } from "circuit-json"
import type { INode as SvgObject } from "svgson"
import {
  type Matrix,
  applyToPoint,
  toString as matrixToString,
} from "transformation-matrix"

export function createSvgObjectsFromPcbSilkscreenCircle(
  pcbSilkscreenCircle: PcbSilkscreenCircle,
  transform: Matrix,
): SvgObject[] {
  const { center, radius, layer } = pcbSilkscreenCircle

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])
  const transformedRadius = radius * Math.abs(transform.a)

  return [
    {
      name: "circle",
      type: "element",
      attributes: {
        cx: transformedX.toString(),
        cy: transformedY.toString(),
        r: transformedRadius.toString(),
        class: `pcb-silkscreen-circle pcb-silkscreen-${layer}`,
        transform: matrixToString(transform),
        "data-pcb-silkscreen-circle-id":
          pcbSilkscreenCircle.pcb_silkscreen_circle_id,
      },
      value: "",
      children: [],
    },
  ]
}
