import Color from "color"
import type { PcbFabricationNotePath } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbFabricationNotePath(
  fabNotePath: PcbFabricationNotePath,
  ctx: PcbContext,
): SvgObject[] {
  const { transform } = ctx
  if (!Array.isArray(fabNotePath.route) || fabNotePath.route.length < 2)
    return []

  // Close the path if the first and last points are the same
  const firstPoint = fabNotePath.route[0]
  const lastPoint = fabNotePath.route[fabNotePath.route.length - 1]
  const repeatsFirstPoint =
    firstPoint!.x === lastPoint!.x && firstPoint!.y === lastPoint!.y

  const path =
    fabNotePath.route
      .slice(0, repeatsFirstPoint ? -1 : undefined)
      .map((point, index) => {
        const [x, y] = applyToPoint(transform, [point.x, point.y])
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(" ") + (repeatsFirstPoint || fabNotePath.is_filled ? " Z" : "")

  const color = fabNotePath.color || "rgba(255,255,255,0.5)"

  // SVG element opacity composites fill and stroke together. Alpha in each
  // paint would otherwise be applied twice where their coverage overlaps.
  let paint = color
  let opacity: string | undefined
  if (
    fabNotePath.is_filled &&
    fabNotePath.has_stroke !== false &&
    fabNotePath.stroke_width > 0
  ) {
    try {
      const parsedColor = Color(color)
      if (parsedColor.alpha() < 1) {
        paint = parsedColor.alpha(1).rgb().string()
        opacity = parsedColor.alpha().toString()
      }
    } catch {
      // Context-dependent SVG paints (currentColor, var(), url()) must still
      // be resolved by the SVG consumer rather than rejected by this renderer.
    }
  }

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: "pcb-fabrication-note-path",
        stroke: fabNotePath.has_stroke === false ? "none" : paint,
        fill: fabNotePath.is_filled ? paint : "none",
        d: path,
        ...(opacity === undefined ? {} : { opacity }),
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
