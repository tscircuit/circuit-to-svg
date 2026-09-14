import { expect, test } from "bun:test"
import type { PcbBoard, PcbVia, PcbViaInput } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("vias inherit board defaults unless per-side or legacy tenting overrides them", () => {
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 75, y: 50 },
    width: 150,
    height: 100,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
    default_via_tented_on_top: true,
    default_via_tented_on_bottom: false,
  }
  const inherited: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "inherited",
    x: 25,
    y: 50,
    outer_diameter: 20,
    hole_diameter: 10,
    layers: ["top", "bottom"],
  }
  const overridden: PcbVia = {
    ...inherited,
    pcb_via_id: "overridden",
    x: 75,
    tented_on_top: false,
    tented_on_bottom: true,
  }
  const legacy: PcbVia & Pick<PcbViaInput, "is_tented"> = {
    ...inherited,
    pcb_via_id: "legacy",
    x: 125,
    is_tented: false,
  }
  const elements = [board, inherited, overridden, legacy]
  const top = convertCircuitJsonToPcbSvg(elements, {
    layer: "top",
    showSolderMask: true,
    width: 600,
    height: 400,
  })
  const bottom = convertCircuitJsonToPcbSvg(elements, {
    layer: "bottom",
    showSolderMask: true,
  })

  expect(top.match(/class="pcb-via-tenting"/g)).toHaveLength(1)
  expect(bottom.match(/class="pcb-via-tenting"/g)).toHaveLength(1)
  expect(top).toMatchSvgSnapshot(import.meta.path)
  expect(inherited.tented_on_top).toBeUndefined()
  expect(inherited.tented_on_bottom).toBeUndefined()
})
