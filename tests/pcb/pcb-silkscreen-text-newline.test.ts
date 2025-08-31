import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb silkscreen text newline", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      font: "tscircuit2024",
      font_size: 0.2,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "Line1\nLine2",
    },
  ])
  expect(result).toMatchSvgSnapshot(import.meta.path)
})
