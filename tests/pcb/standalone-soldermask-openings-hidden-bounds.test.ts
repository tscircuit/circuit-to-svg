import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { PcbSoldermaskOpening } from "circuit-json"
import { circuit, options } from "../fixtures/standalone-soldermask-openings"

test("hidden mask openings do not expand an unframed footprint viewport", () => {
  const copper = circuit.filter((element) => element.type === "pcb_trace")
  const distantOpening: PcbSoldermaskOpening = {
    type: "pcb_soldermask_opening",
    pcb_soldermask_opening_id: "distant",
    shape: "circle",
    layer: "bottom",
    x: 1000,
    y: 1000,
    radius: 10,
  }
  for (const showSolderMask of [false, true]) {
    expect(
      convertCircuitJsonToPcbSvg([...copper, distantOpening], {
        layer: "top",
        showSolderMask,
      }),
    ).toBe(convertCircuitJsonToPcbSvg(copper, { layer: "top", showSolderMask }))
  }
})
