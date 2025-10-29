import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb panel with multiple boards", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_panel",
      pcb_panel_id: "pcb_panel_0",
      width: 100,
      height: 80,
      covered_with_solder_mask: false,
    },
    // Board 1
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 25, y: 40 },
      width: 40,
      height: 60,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // Board 2
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      center: { x: 75, y: 40 },
      width: 40,
      height: 60,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // An smtpad on board 1
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_0",
      layer: "top",
      shape: "rect",
      x: 25,
      y: 40,
      width: 4,
      height: 3,
    },
    // An smtpad on board 2
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_1",
      layer: "top",
      shape: "rect",
      x: 75,
      y: 40,
      width: 4,
      height: 3,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
