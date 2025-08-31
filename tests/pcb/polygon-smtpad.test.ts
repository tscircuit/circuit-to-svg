import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("polygon smtpad shape", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_smtpad",
      layer: "top" as const,
      shape: "polygon" as const,
      points: [
        { x: -2, y: 0 },
        { x: -1, y: 1.5 },
        { x: 1, y: 1.5 },
        { x: 2, y: 0 },
        { x: 1, y: -1.5 },
        { x: -1, y: -1.5 },
      ],
      pcb_smtpad_id: "polygon_pad_0",
    },
  ])
  expect(result).toMatchSvgSnapshot(import.meta.path)
})
