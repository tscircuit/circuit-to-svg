import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen pill shape", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board_silkscreen_pill",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_silkscreen_pill",
      layer: "top" as const,
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_pill_id: "pill_1",
      center: { x: 2, y: 3 },
      width: 4,
      height: 2,
    },
    {
      type: "pcb_silkscreen_pill",
      layer: "bottom" as const,
      pcb_component_id: "pcb_component_2",
      pcb_silkscreen_pill_id: "pill_2",
      center: { x: -1, y: -2 },
      width: 3,
      height: 1,
    },
    {
      type: "pcb_silkscreen_pill",
      layer: "top" as const,
      pcb_component_id: "pcb_component_3",
      pcb_silkscreen_pill_id: "pill_3",
      center: { x: 5, y: 5 },
      width: 2,
      height: 4,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})


