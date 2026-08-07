import { expect, test } from "bun:test"
import type { AnyCircuitElement, LayerRef, PcbTrace } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import gameboyPcbJson from "./assets/abse-gameboy-1.0.16-pcb.json"

// PCB-only subset of https://tscircuit.com/abse/gameboy@1.0.16, rebuilt with
// tscircuit 0.0.2220. Non-rendered source, schematic, CAD, and DRC elements
// were removed to keep this real-circuit regression fixture reviewable.
const gameboyPcb = gameboyPcbJson as AnyCircuitElement[]
const gameboyTraces = gameboyPcb.filter(
  (element): element is PcbTrace => element.type === "pcb_trace",
)

test.each(["top", "bottom"] satisfies LayerRef[])(
  "renders abse/gameboy ground pours without covered %s-layer traces",
  (layer) => {
    const markedRoutePointCount = gameboyTraces.reduce(
      (count, trace) =>
        count +
        trace.route.filter(
          (point) =>
            "is_inside_copper_pour" in point &&
            point.is_inside_copper_pour === true,
        ).length,
      0,
    )
    const layerPourCount = gameboyPcb.filter(
      (element) =>
        element.type === "pcb_copper_pour" && element.layer === layer,
    ).length

    expect(gameboyTraces).toHaveLength(253)
    expect(markedRoutePointCount).toBe(290)
    expect(layerPourCount).toBe(layer === "top" ? 63 : 30)

    const svg = convertCircuitJsonToPcbSvg(gameboyPcb, {
      layer,
      width: 800,
      matchBoardAspectRatio: true,
      drawPaddingOutsideBoard: false,
      includeVersion: false,
    })

    expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      `real-circuit-gameboy-${layer}-layer`,
    )
  },
)
