import type { PcbSilkscreenPath, PcbFabricationNotePath } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbFabricationNotePath(
  fabNotePath: PcbFabricationNotePath,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter } = ctx
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
        "data-type": "pcb_fabrication_note_path",
        "data-pcb-layer": "overlay",
      },
      value: "",
      children: [],
    },
  ]
}
