import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("viewportTarget panel option sets bounds to panel", () => {
  const result = convertCircuitJsonToPcbSvg(
    [
      {
        type: "pcb_panel",
        pcb_panel_id: "panel1",
        width: 80,
        center: { x: 40, y: 30 },
        height: 60,
        covered_with_solder_mask: true,
      },
      {
        type: "pcb_board",
        pcb_board_id: "board1",
        center: { x: 40, y: 30 },
        width: 40,
        height: 20,
        material: "fr4",
        num_layers: 2,
        thickness: 1.6,
      },
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: "pad1",
        layer: "top",
        shape: "rect",
        x: 40,
        y: 30,
        width: 4,
        height: 3,
      },
    ],
    {
      viewportTarget: {
        pcb_panel_id: "panel1",
      },
    },
  )

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
