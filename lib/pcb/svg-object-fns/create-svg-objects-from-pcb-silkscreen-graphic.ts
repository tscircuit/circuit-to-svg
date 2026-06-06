import type { PcbSilkscreenGraphic } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { ringToPathD } from "lib/utils/ring-to-path-d"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbSilkscreenGraphic(
  silkscreenGraphic: PcbSilkscreenGraphic,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap } = ctx
  const { layer = "top" } = silkscreenGraphic

  if (layerFilter && layer !== layerFilter) return []
  if (silkscreenGraphic.shape !== "brep") return []

  const color =
    layer === "bottom" ? colorMap.silkscreen.bottom : colorMap.silkscreen.top

  let d = ringToPathD(
    silkscreenGraphic.brep_shape.outer_ring.vertices,
    transform,
  )

  for (const innerRing of silkscreenGraphic.brep_shape.inner_rings ?? []) {
    d += ` ${ringToPathD(innerRing.vertices, transform)}`
  }

  return [
    {
      name: "path",
      type: "element",
      attributes: {
        class: `pcb-silkscreen pcb-silkscreen-${layer}`,
        d,
        fill: color,
        "fill-rule": "evenodd",
        stroke: "none",
        "data-pcb-component-id": silkscreenGraphic.pcb_component_id,
        "data-pcb-silkscreen-graphic-id":
          silkscreenGraphic.pcb_silkscreen_graphic_id,
        "data-type": "pcb_silkscreen_graphic",
        "data-pcb-layer": layer,
      },
      value: "",
      children: [],
    },
  ]
}
