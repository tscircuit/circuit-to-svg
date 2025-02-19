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
  const {
    center,
    radius,
    layer = "top",
    pcb_silkscreen_circle_id,
  } = pcbSilkscreenCircle

  if (
    !center ||
    typeof center.x !== "number" ||
    typeof center.y !== "number" ||
    typeof radius !== "number"
  ) {
    console.error("Invalid PCB Silkscreen Circle data:", { center, radius })
    return []
  }

  const [transformedX, transformedY] = applyToPoint(transform, [
    center.x,
    center.y,
  ])
  const transformedRadius = radius * Math.abs(transform.a)

  console.debug(
    `Transformed Circle - X: ${transformedX}, Y: ${transformedY}, Radius: ${transformedRadius}`,
  )

  const svgObject: SvgObject = {
    name: "circle",
    type: "element",
    attributes: {
      cx: transformedX.toString(),
      cy: transformedY.toString(),
      r: transformedRadius.toString(),
      class: `pcb-silkscreen-circle pcb-silkscreen-${layer}`,
      stroke: "red",
      "stroke-width": "3",
      "data-pcb-silkscreen-circle-id": pcb_silkscreen_circle_id,
    },
    value: "",
    children: [],
  }

  console.log(svgObject)
  return [svgObject]
}
