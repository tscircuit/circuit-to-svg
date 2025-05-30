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
      stroke_width: 0.001,
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
      stroke_width: 0.001,
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
    },
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_1",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 3, y: -3 },
      anchor_alignment: "center",
      text: "BOTTOM TEXT",
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

  const smallBoard = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 10,
      height: 10,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      font: "tscircuit2024",
      font_size: 0.5,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "text in small board",
    },
  ])

  const bigBoard = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 100,
      height: 100,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      font: "tscircuit2024",
      font_size: 0.5,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "text in big board",
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
  expect(smallBoard).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-text-small-board",
  )
  expect(bigBoard).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-text-big-board",
  )
})
