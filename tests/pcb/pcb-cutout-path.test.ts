import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb cutout path", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 50,
      height: 40,
      material: "fr1",
      num_layers: 2,
      thickness: 1.2,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "pcb_cutout_path_0",
      shape: "path",
      route: [
        { x: -10, y: 10 },
        { x: -5, y: 15 },
        { x: 0, y: 10 },
        { x: 5, y: 15 },
        { x: 10, y: 10 },
      ],
      slot_width: 1,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "pcb_cutout_path_closed_0",
      shape: "path",
      route: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 }, // Closed path
      ],
      slot_width: 1,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
