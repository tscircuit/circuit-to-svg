import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen oval shape", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board_silkscreen_oval",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_silkscreen_oval",
      layer: "top" as const,
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_oval_id: "oval_1",
      center: { x: 2, y: 3 },
      radius_x: 2,
      radius_y: 1,
    },
    {
      type: "pcb_silkscreen_oval",
      layer: "bottom" as const,
      pcb_component_id: "pcb_component_2",
      pcb_silkscreen_oval_id: "oval_2",
      center: { x: -1, y: -2 },
      radius_x: 1.5,
      radius_y: 0.5,
    },
    {
      type: "pcb_silkscreen_oval",
      layer: "top" as const,
      pcb_component_id: "pcb_component_3",
      pcb_silkscreen_oval_id: "oval_3",
      center: { x: 5, y: 5 },
      radius_x: 1,
      radius_y: 2,
    },
    {
      type: "pcb_silkscreen_oval",
      layer: "top" as const,
      pcb_component_id: "pcb_component_4",
      pcb_silkscreen_oval_id: "oval_4",
      center: { x: -5, y: 3 },
      radius_x: 2,
      radius_y: 1,
      ccw_rotation: 45,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
