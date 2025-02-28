import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen text", () => {
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
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 6.35, y: 0 },
      anchor_alignment: "center",
      text: "${REFERENCE}",
      stroke_width: 0.1,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "${REF}",
      stroke_width: 0.1,
    },
    {
      type: "pcb_fabrication_note_text",
      layer: "top",
      font: "tscircuit2024",
      font_size: 1.27,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 6.35, y: 8.5 },
      anchor_alignment: "center",
      text: "REF**",
      pcb_fabrication_note_text_id: "pcb_fabrication_note_text_0",
    },

    {
      type: "pcb_fabrication_note_text",
      layer: "top",
      font: "tscircuit2024",
      font_size: 1.27,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 6.35, y: -8.5 },
      anchor_alignment: "center",
      text: "Heatsink_AAVID_576802B03900G",
      pcb_fabrication_note_text_id: "pcb_fabrication_note_text_1",
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
