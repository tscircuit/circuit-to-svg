import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen line", () => {
  const result = convertCircuitJsonToPcbSvg([
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
    {
      type: "pcb_silkscreen_line",
      layer: "top",
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_line_id: "line_1",
      x1: 0,
      y1: 0,
      x2: 5,
      y2: 5,
      stroke_width: 0.2,
    },
    {
      type: "pcb_silkscreen_line",
      layer: "bottom",
      pcb_component_id: "pcb_component_2",
      pcb_silkscreen_line_id: "line_2",
      x1: -3,
      y1: -3,
      x2: -1,
      y2: -1,
      stroke_width: 0.3,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
