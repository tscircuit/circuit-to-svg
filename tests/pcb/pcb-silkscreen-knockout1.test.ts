import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb silkscreen text (no knockout)", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_text",
      pcb_component_id: "pcb_silkscreen_text_0",
      layer: "top",
      anchor_position: { x: 10, y: 10 },
      anchor_alignment: "center",
      text: "HV-IN",
      font_size: 2.4,
      ccw_rotation: 0,
      knockout: false,
      knockout_padding: 0.25,
    },
  ] as any)

  expect(svg).toMatchSnapshot()
})
