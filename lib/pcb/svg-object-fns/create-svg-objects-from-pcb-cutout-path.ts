import type { PcbCutoutPath } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbCutoutPath(
  cutoutPath: PcbCutoutPath,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap } = ctx
  if (!cutoutPath.route || !Array.isArray(cutoutPath.route)) return []

  const validRoute = cutoutPath.route.filter(
    (point: any) =>
      Boolean(point) && Number.isFinite(point.x) && Number.isFinite(point.y),
  )
  if (validRoute.length < 2) return []

  // Close the path if the first and last points are the same
  const firstPoint = validRoute[0]
  const lastPoint = validRoute[validRoute.length - 1]
  const isClosed =
    firstPoint &&
    lastPoint &&
    firstPoint.x === lastPoint.x &&
    firstPoint.y === lastPoint.y

  const pointsToRender = isClosed ? validRoute.slice(0, -1) : validRoute
  if (pointsToRender.length < 2) return []

  const path =
    pointsToRender
      .map((point: any, index: number) => {
        const [x, y] = applyToPoint(transform, [point.x, point.y])
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(" ") + (isClosed ? " Z" : "")

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-cutout pcb-cutout-path",
        d: path,
        fill: colorMap.drill,
        "data-type": "pcb_cutout_path",
        "data-pcb-cutout-id": cutoutPath.pcb_cutout_id,
        "data-pcb-layer": "drill",
      },
      value: "",
      children: [],
    },
  ]
}
