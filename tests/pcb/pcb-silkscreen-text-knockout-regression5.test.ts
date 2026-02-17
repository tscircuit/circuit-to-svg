import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen text - knockout_padding ignored when is_knockout is false", () => {
  const paddingIgnored = convertCircuitJsonToPcbSvg([
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
      pcb_silkscreen_text_id: "text_padding_ignored",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "comp_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "NOPAD",
      is_knockout: false,
      // This should be ignored since is_knockout is false
      knockout_padding: {
        left: 5.0,
        right: 5.0,
        top: 5.0,
        bottom: 5.0,
      },
    },
  ])

  expect(paddingIgnored).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-text-padding-ignored-when-not-knockout",
  )
})
