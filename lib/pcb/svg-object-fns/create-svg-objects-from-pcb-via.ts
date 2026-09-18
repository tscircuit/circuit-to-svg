import type { PCBVia, PcbViaInput } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { createSoldermaskOverlayElement } from "./create-soldermask-overlay-element"

export function createSvgObjectsFromPcbVia(
  hole: PCBVia,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap } = ctx
  const layer = ctx.layer ?? "top"
  const showSolderMask =
    ctx.showSolderMask && (layer === "top" || layer === "bottom")
  if (showSolderMask && !hole.layers.includes(layer)) return []

  const boardOwnerId = ctx.boardOwnerMap?.has(hole.pcb_via_id)
    ? hole.pcb_via_id
    : (hole.pcb_trace_id ?? hole.pcb_via_id)
  const board = ctx.boardOwnerMap?.get(boardOwnerId)
  const tenting: PcbViaInput = hole
  const isTented =
    (layer === "top" ? tenting.tented_on_top : tenting.tented_on_bottom) ??
    tenting.is_tented ??
    (layer === "top"
      ? board?.default_via_tented_on_top
      : board?.default_via_tented_on_bottom)
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])
  const scaledOuterWidth =
    (Number.isFinite(hole.outer_diameter) ? hole.outer_diameter : 0) *
    Math.abs(transform.a)
  const scaledOuterHeight =
    (Number.isFinite(hole.outer_diameter) ? hole.outer_diameter : 0) *
    Math.abs(transform.a)
  const scaledHoleWidth =
    (Number.isFinite(hole.hole_diameter) ? hole.hole_diameter : 0) *
    Math.abs(transform.a)
  const scaledHoleHeight =
    (Number.isFinite(hole.hole_diameter) ? hole.hole_diameter : 0) *
    Math.abs(transform.a)

  const outerRadius = Math.min(scaledOuterWidth, scaledOuterHeight) / 2
  const innerRadius = Math.min(scaledHoleWidth, scaledHoleHeight) / 2
  const via: SvgObject = {
    name: "g",
    type: "element",
    value: "",
    attributes: {
      "data-type": "pcb_via",
      "data-pcb-layer": "through",
    },
    children: [
      {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-outer",
          fill: colorMap.copper[showSolderMask ? layer : "top"]!,
          cx: x.toString(),
          cy: y.toString(),
          r: outerRadius.toString(),
          "data-type": "pcb_via",
          "data-pcb-layer": showSolderMask ? layer : "top",
        },
      },
      {
        name: "circle",
        type: "element",
        value: "",
        children: [],
        attributes: {
          class: "pcb-hole-inner",
          fill: colorMap.drill,

          cx: x.toString(),
          cy: y.toString(),
          r: innerRadius.toString(),
          "data-type": "pcb_via",
          "data-pcb-layer": "drill",
        },
      },
    ],
  }

  if (showSolderMask && isTented) {
    // Keep this overlay in the via group so it covers the drill as well as
    // the copper ring, even when a connected trace runs through the via.
    via.children.push(
      createSoldermaskOverlayElement({
        elementType: "circle",
        shapeAttributes: {
          cx: x.toString(),
          cy: y.toString(),
          r: outerRadius.toString(),
        },
        layer,
        fillColor: colorMap.soldermaskWithCopperUnderneath[layer],
        fillOpacity: "1",
        className: "pcb-via-tenting",
      }),
    )
  }

  return [via]
}
