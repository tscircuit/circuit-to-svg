import type { PCBVia } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { SvgObject } from "lib/svg-object"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"

export function createSvgObjectsFromPcbVia(
  hole: PCBVia,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, colorMap, showSolderMask } = ctx
  const [x, y] = applyToPoint(transform, [hole.x, hole.y])
  const scaledOuterDiameter = hole.outer_diameter * Math.abs(transform.a)
  const scaledHoleDiameter = hole.hole_diameter * Math.abs(transform.a)

  const outerRadius = scaledOuterDiameter / 2
  const innerRadius = scaledHoleDiameter / 2

  // Via is covered with solder mask when is_masked is true or not explicitly set to false
  const isCoveredWithSolderMask =
    (hole as any).is_masked !== false &&
    (hole as any).is_covered_with_solder_mask !== false

  const outerCircle: SvgObject = {
    name: "circle",
    type: "element",
    value: "",
    children: [],
    attributes: {
      class: "pcb-hole-outer",
      fill: colorMap.copper.top,
      cx: x.toString(),
      cy: y.toString(),
      r: outerRadius.toString(),
      "data-type": "pcb_via",
      "data-pcb-layer": "top",
    },
  }

  const innerCircle: SvgObject = {
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
  }

  const result: SvgObject[] = [outerCircle, innerCircle]

  // When showSolderMask is enabled and the via annular ring is covered,
  // render a soldermask overlay over the copper annular ring
  if (showSolderMask && isCoveredWithSolderMask) {
    const soldermaskColor = colorMap.soldermaskWithCopperUnderneath.top

    // Top soldermask overlay (covers the annular ring but not the drill hole)
    const topSoldermaskOuter: SvgObject = {
      name: "circle",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-via-soldermask",
        fill: soldermaskColor,
        cx: x.toString(),
        cy: y.toString(),
        r: outerRadius.toString(),
        "data-type": "pcb_soldermask",
        "data-pcb-layer": "soldermask-top",
      },
    }

    // Drill hole cutout through the soldermask
    const drillCutout: SvgObject = {
      name: "circle",
      type: "element",
      value: "",
      children: [],
      attributes: {
        class: "pcb-via-drill-cutout",
        fill: colorMap.drill,
        cx: x.toString(),
        cy: y.toString(),
        r: innerRadius.toString(),
        "data-type": "pcb_soldermask",
        "data-pcb-layer": "soldermask-top",
      },
    }

    result.push(topSoldermaskOuter, drillCutout)
  }

  return result
}
