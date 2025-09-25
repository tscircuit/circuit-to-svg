import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("knockout with border", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_003",
      pcb_component_id: "comp_003",
      layer: "top",
      anchor_position: { x: 30, y: 10 },
      anchor_alignment: "center",
      text: "BORDERED",
      font_size: 2,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm",
        top: "0.5mm",
        bottom: "0.5mm",
      },
      knockout_border_width: "0.2mm",
    },
  ] as any)

  expect(svg).toContain('stroke-width="')
  expect(svg).toContain('fill="none"')
})
