import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb silkscreen knockout with rounded corners", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_002",
      pcb_component_id: "comp_002",
      layer: "top",
      anchor_position: { x: 20, y: 10 },
      anchor_alignment: "center",
      text: "ROUNDED",
      font_size: 2,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm",
        top: "0.5mm",
        bottom: "0.5mm",
      },
      knockout_corner_radius: "0.3mm",
    },
  ] as any)

  expect(svg).toContain('rx="')
  expect(svg).toContain('ry="')
})
