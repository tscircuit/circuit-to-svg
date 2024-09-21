import type { PcbSilkscreenPath, PcbFabricationNotePath } from "@tscircuit/soup"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { SvgObject } from "../svg-object"

export function createSvgObjectsFromPcbFabricationNotePath(
  fabNotePath: PcbFabricationNotePath,
  transform: Matrix,
): SvgObject[] {
  if (!fabNotePath.route || !Array.isArray(fabNotePath.route)) return []

  // Close the path if the first and last points are the same
  const firstPoint = fabNotePath.route[0]
  const lastPoint = fabNotePath.route[fabNotePath.route.length - 1]
  const isClosed =
    firstPoint!.x === lastPoint!.x && firstPoint!.y === lastPoint!.y

  const path =
    fabNotePath.route
      .slice(0, isClosed ? -1 : undefined)
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
        class: "pcb-fabrication-note-path",
        stroke: fabNotePath.color || "rgba(255,255,255,0.5)",
        fill: "none",
        d: path,
        "stroke-width": (
          fabNotePath.stroke_width * Math.abs(transform.a)
        ).toString(),
        "data-pcb-component-id": fabNotePath.pcb_component_id,
        "data-pcb-fabrication-note-path-id":
          fabNotePath.pcb_fabrication_note_path_id,
      },
      value: "",
      children: [],
    },
  ]
}
