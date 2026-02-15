import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb fabrication note text newline", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
      num_layers: 2,
      pcb_board_id: "pcb_board_0",
      thickness: 1.2,
      material: "fr1",
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "pcb_fabrication_note_text_0",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "Line1\nLine2",
      layer: "top",
    },
  ]

  const result = convertCircuitJsonToPcbSvg(circuitJson)
  expect(result).toMatchSvgSnapshot(import.meta.path)
})
