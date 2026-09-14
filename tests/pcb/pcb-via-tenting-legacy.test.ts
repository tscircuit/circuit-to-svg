import { expect, test } from "bun:test"
import type { PcbVia, PcbViaInput } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("explicit top false overrides legacy tenting while bottom inherits it", () => {
  const via: PcbVia & Pick<PcbViaInput, "is_tented"> = {
    type: "pcb_via",
    pcb_via_id: "via",
    x: 0,
    y: 0,
    outer_diameter: 2,
    hole_diameter: 1,
    layers: ["top", "bottom"],
    is_tented: true,
    tented_on_top: false,
  }
  const top = convertCircuitJsonToPcbSvg([via], { showSolderMask: true })
  const bottom = convertCircuitJsonToPcbSvg([via], {
    layer: "bottom",
    showSolderMask: true,
  })

  expect(top).not.toContain('class="pcb-via-tenting"')
  expect(bottom).toContain('class="pcb-via-tenting"')
})
