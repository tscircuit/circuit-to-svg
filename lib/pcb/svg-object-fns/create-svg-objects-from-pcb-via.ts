import type { PCBVia, PcbViaInput } from "circuit-json"
import Color from "color"
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
  const scaledOuterWidth = hole.outer_diameter * Math.abs(transform.a)
  const scaledOuterHeight = hole.outer_diameter * Math.abs(transform.a)
  const scaledHoleWidth = hole.hole_diameter * Math.abs(transform.a)
  const scaledHoleHeight = hole.hole_diameter * Math.abs(transform.a)

  const outerRadius = Math.min(scaledOuterWidth, scaledOuterHeight) / 2
  const innerRadius = Math.min(scaledHoleWidth, scaledHoleHeight) / 2
  const via: SvgObject = {
    name: "g",
    type: "element",
    value: "",
    attributes: {
      "data-type": "pcb_via",
      "data-pcb-layer": showSolderMask && isTented ? layer : "through",
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
    let maskPaint = colorMap.soldermaskWithCopperUnderneath[layer]
    let holePaint: string | undefined
    let maskOpacity = 1
    try {
      const maskColor = Color(maskPaint)
      maskOpacity = maskColor.alpha()
      maskPaint = maskColor.alpha(1).rgb().string()
      holePaint = Color.rgb(
        maskColor.red() / 2,
        maskColor.green() / 2,
        maskColor.blue() / 2,
      ).string()
    } catch {
      // Leave currentColor, var() and url() paints for the SVG consumer to resolve.
    }

    // Composite the mask once so its center keeps the configured alpha.
    // Keeping a solid base also avoids seams at the antialiased hole boundary.
    const tentingOverlay: SvgObject = {
      name: "g",
      type: "element",
      value: "",
      attributes: {
        class: "pcb-via-tenting",
        "data-type": "pcb_soldermask",
        "data-pcb-layer": layer,
        opacity: maskOpacity.toString(),
      },
      children: [
        createSoldermaskOverlayElement({
          elementType: "circle",
          shapeAttributes: {
            cx: x.toString(),
            cy: y.toString(),
            r: outerRadius.toString(),
          },
          layer,
          fillColor: maskPaint,
          fillOpacity: "1",
          className: "pcb-via-tenting-ring",
        }),
      ],
    }

    if (holePaint !== undefined) {
      // Shade the hole beneath the mask without changing the drill geometry.
      tentingOverlay.children.push(
        createSoldermaskOverlayElement({
          elementType: "circle",
          shapeAttributes: {
            cx: x.toString(),
            cy: y.toString(),
            r: innerRadius.toString(),
          },
          layer,
          fillColor: holePaint,
          fillOpacity: "1",
          className: "pcb-via-tenting-hole",
        }),
      )
    }
    via.children.push(tentingOverlay)
  }

  return [via]
}
