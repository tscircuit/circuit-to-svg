import { test, expect } from "bun:test"
import { writeFileSync } from "fs"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb silkscreen text (knockout + padding)", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_component_id: "pcb_silkscreen_text_1",
      layer: "top",
      anchor_position: { x: 20, y: 12 },
      anchor_alignment: "center",
      text: "HELLO",
      font_size: 2.4,
      ccw_rotation: 0,
      knockout: true,
      knockout_padding: 0.5,
    },
  ] as any)

  writeFileSync("knockout-demo.svg", svg)

  expect(svg).toContain("<mask")
  expect(svg).toMatchSnapshot()
})
