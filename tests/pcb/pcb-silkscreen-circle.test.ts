import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("convert PCB elements to SVG with silkscreen circles and text", () => {
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

    // Silkscreen circles
    {
      type: "pcb_silkscreen_circle",
      layer: "top",
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_circle_id: "circle_1",
      center: { x: 2, y: 3 },
      radius: 1.5,
      stroke_width: 0.2,
    },
    {
      type: "pcb_silkscreen_circle",
      layer: "bottom",
      pcb_component_id: "pcb_component_2",
      pcb_silkscreen_circle_id: "circle_2",
      center: { x: -2, y: -3 },
      radius: 2,
      stroke_width: 0.3,
    },
  ])

  // Validate that the result matches the expected SVG structure
  expect(result).toMatchSvgSnapshot(import.meta.path)
})
