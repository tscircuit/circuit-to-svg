import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("mixed regular and knockout text", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_005",
      pcb_component_id: "comp_005",
      layer: "top",
      anchor_position: { x: 10, y: 20 },
      anchor_alignment: "center",
      text: "KNOCKOUT",
      font_size: 2,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm",
        top: "0.5mm",
        bottom: "0.5mm",
      },
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_006",
      pcb_component_id: "comp_006",
      layer: "top",
      anchor_position: { x: 30, y: 20 },
      anchor_alignment: "center",
      text: "NORMAL",
      font_size: 2,
      is_knockout: false,
    },
  ] as any)

  // Knockout text should have mask
  expect(svg).toContain("KNOCKOUT")
  expect(svg).toContain("<mask")

  // Normal text should not have mask but be simple text element
  expect(svg).toContain("NORMAL")
  expect(svg.match(/<text[^>]*>.*NORMAL/)).toBeTruthy()
})
