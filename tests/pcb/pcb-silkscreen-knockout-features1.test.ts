import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb silkscreen text with knockout and padding", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text_001",
      pcb_component_id: "comp_001",
      layer: "top",
      anchor_position: { x: 10, y: 10 },
      anchor_alignment: "center",
      text: "VIN 3-5V",
      font_size: 2,
      ccw_rotation: 0,
      is_knockout: true,
      knockout_padding: {
        left: "0.5mm",
        right: "0.5mm",
        top: "0.5mm",
        bottom: "0.5mm",
      },
    },
  ] as any)

  expect(svg).toContain("<mask")
  expect(svg).toContain('mask="url(#knockout-mask-')
  expect(svg).toContain("VIN 3-5V")
})
