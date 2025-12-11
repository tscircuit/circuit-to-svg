import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb_component positioned relative to pcb_board shows anchor offsets", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 12,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      center: { x: 4, y: 3 },
      width: 4,
      height: 4,
      position_mode: "relative_to_group_anchor",
      positioned_relative_to_pcb_board_id: "board_1",
      display_x_offset: "1.5mm",
      display_y_offset: 2.5,
    },
  ] as any

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showAnchorOffsets: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
