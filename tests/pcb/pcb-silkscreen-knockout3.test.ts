import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb silkscreen text (knockout rotated 15°)", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_component_id: "pcb_silkscreen_text_2",
      layer: "top",
      anchor_position: { x: 30, y: 15 },
      anchor_alignment: "center",
      text: "VIN",
      font_size: 2.0,
      ccw_rotation: 15,
      knockout: true,
      knockout_padding: 0.3,
    },
  ] as any)

  expect(svg).toContain("<mask")
  expect(svg).toMatchSnapshot()
})
