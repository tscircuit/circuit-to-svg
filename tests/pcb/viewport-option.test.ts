import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("viewport option sets custom bounds", () => {
  const result = convertCircuitJsonToPcbSvg(
    [
      {
        type: "pcb_board",
        pcb_board_id: "pcb_board_0",
        center: { x: 50, y: 50 },
        width: 40,
        height: 20,
        material: "fr4",
        num_layers: 2,
        thickness: 1.6,
      },
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: "pcb_smtpad_0",
        layer: "top",
        shape: "rect",
        x: 50,
        y: 50,
        width: 4,
        height: 3,
      },
    ],
    {
      viewport: {
        minX: 40,
        minY: 40,
        maxX: 60,
        maxY: 60,
      },
    },
  )

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
