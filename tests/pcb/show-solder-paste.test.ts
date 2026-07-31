import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    num_layers: 2,
    material: "fr4",
    thickness: 1.6,
  },
  {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "paste_top",
    pcb_component_id: "component0",
    layer: "top",
    shape: "rect",
    x: -1,
    y: 0,
    width: 1,
    height: 2,
  },
  {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "paste_bottom",
    pcb_component_id: "component0",
    layer: "bottom",
    shape: "circle",
    x: 1,
    y: 0,
    radius: 0.5,
  },
]

test("solder paste is hidden by default", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svg).not.toContain('data-type="pcb_solder_paste"')
})

test("showSolderPaste renders solder paste for the selected layer", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "top",
    showSolderPaste: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
