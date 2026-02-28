import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen knockout text - default padding (no knockout_padding specified)", () => {
  const defaultPadding = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 20,
      height: 10,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.2,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "text_default_padding",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "DEFAULT",
      is_knockout: true,
      // knockout_padding not specified - should use defaults
    },
  ])

  expect(defaultPadding).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-default-padding",
  )
})
