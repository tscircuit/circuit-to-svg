import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("knockout with custom color", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_004",
      pcb_component_id: "comp_004",
      layer: "top",
      anchor_position: { x: 40, y: 10 },
      anchor_alignment: "center",
      text: "GOLDEN",
      font_size: 2,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm",
        top: "0.5mm",
        bottom: "0.5mm",
      },
      knockout_color: "#FFD700",
    },
  ] as any)

  expect(svg).toContain('fill="#FFD700"')
})
