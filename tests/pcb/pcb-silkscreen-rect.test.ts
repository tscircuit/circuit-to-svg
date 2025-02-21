import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen rect shape", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_rect",
      layer: "top" as const,
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_rect_id: "rect_1",
      center: { x: 2, y: 3 },
      width: 4,
      height: 2,
      stroke_width: 0.2,
    },
    {
      type: "pcb_silkscreen_rect",
      layer: "bottom" as const,
      pcb_component_id: "pcb_component_2",
      pcb_silkscreen_rect_id: "rect_2",
      center: { x: -1, y: -2 },
      width: 3,
      height: 1,
      stroke_width: 0.2,
    },
    {
      type: "pcb_fabrication_note_path",
      layer: "top",
      pcb_component_id: "pcb_generic_component_0",
      pcb_fabrication_note_path_id: "fabrication_note_path_4",
      route: [
        { x: 12.295, y: 7.24 },
        { x: 12.295, y: -7.24 },
      ],
      stroke_width: 0.1,
    },

    {
      type: "pcb_fabrication_note_path",
      layer: "top",
      pcb_component_id: "pcb_generic_component_0",
      pcb_fabrication_note_path_id: "fabrication_note_path_6",
      route: [
        { x: 12.3, y: -6.43 },
        { x: 0.405, y: -5.597 },
      ],
      stroke_width: 0.1,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
