import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("repro: pcb fabrication note text ccw_rotation", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 20,
      height: 14,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fab_text_rotation_0",
      pcb_component_id: "pcb_component_0",
      anchor_position: { x: -5, y: 4 },
      anchor_alignment: "center",
      text: "Text with 0 degrees",
      font: "tscircuit2024",
      font_size: 0.8,
      ccw_rotation: 0,
      layer: "top",
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fab_text_rotation_45",
      pcb_component_id: "pcb_component_0",
      anchor_position: { x: 5, y: 4 },
      anchor_alignment: "center",
      text: "Text with 45 degrees",
      font: "tscircuit2024",
      font_size: 0.8,
      ccw_rotation: 45,
      layer: "top",
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fab_text_rotation_90",
      pcb_component_id: "pcb_component_0",
      anchor_position: { x: -5, y: -4 },
      anchor_alignment: "center",
      text: "Text with 90 degrees",
      font: "tscircuit2024",
      font_size: 0.8,
      ccw_rotation: 90,
      layer: "top",
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fab_text_rotation_180",
      pcb_component_id: "pcb_component_0",
      anchor_position: { x: 5, y: -4 },
      anchor_alignment: "center",
      text: "Text with 180 degrees",
      font: "tscircuit2024",
      font_size: 0.8,
      ccw_rotation: 180,
      layer: "top",
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
