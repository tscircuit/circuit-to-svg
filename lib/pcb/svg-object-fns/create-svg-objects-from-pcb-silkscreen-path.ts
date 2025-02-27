import type { PcbSilkscreenPath } from "circuit-json"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"

export function createSvgObjectsFromPcbSilkscreenPath(
  silkscreenPath: PcbSilkscreenPath,
  transform: Matrix,
): SvgObject[] {
  if (!silkscreenPath.route || !Array.isArray(silkscreenPath.route)) return []

  let path = silkscreenPath.route
    .map((point: any, index: number) => {
      const [x, y] = applyToPoint(transform, [point.x, point.y])
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(" ")

  // Close the path if the first and last points match
  const firstPoint = silkscreenPath.route[0]
  const lastPoint = silkscreenPath.route[silkscreenPath.route.length - 1]
  if (
    firstPoint &&
    lastPoint &&
    firstPoint.x === lastPoint.x &&
    firstPoint.y === lastPoint.y
  ) {
    path += " Z"
  }
  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: `pcb-silkscreen pcb-silkscreen-${silkscreenPath.layer}`,
        d: path,
        fill: "none",
        stroke: "#f2eda1",
        "stroke-width": (
          silkscreenPath.stroke_width * Math.abs(transform.a)
        ).toString(),
        "data-pcb-component-id": silkscreenPath.pcb_component_id,
        "data-pcb-silkscreen-path-id": silkscreenPath.pcb_silkscreen_path_id,
      },
      value: "",
      children: [],
    },
  ]
}
