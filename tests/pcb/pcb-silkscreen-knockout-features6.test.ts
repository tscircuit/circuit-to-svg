import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("knockout text with rotation", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_007",
      pcb_component_id: "comp_007",
      layer: "top",
      anchor_position: { x: 25, y: 25 },
      anchor_alignment: "center",
      text: "ROTATED",
      font_size: 2,
      ccw_rotation: 45,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm",
        top: "0.5mm",
        bottom: "0.5mm",
      },
    },
  ] as any)

  expect(svg).toContain("transform=")
  expect(svg).toContain("ROTATED")
})
