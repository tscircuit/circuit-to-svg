import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  material: "fr4",
  num_layers: 2,
  thickness: 1.6,
}

test("non-finite silkscreen sizes use the default for normal and knockout text", () => {
  const render = (font_size: number, is_knockout: boolean) =>
    convertCircuitJsonToPcbSvg([
      board,
      {
        type: "pcb_silkscreen_text",
        pcb_silkscreen_text_id: "text_0",
        pcb_component_id: "component_0",
        anchor_position: { x: 1, y: 2 },
        anchor_alignment: "top_left",
        layer: "top",
        font: "tscircuit2024",
        text: "Default\nsize",
        font_size,
        is_knockout,
      },
    ]).replace(/silkscreen-knockout-mask-text_0-\d+/g, "knockout-mask")

  for (const knockout of [false, true]) {
    const expected = render(1, knockout)
    expect(expected).not.toMatch(/NaN|Infinity/)
    for (const invalid of [NaN, Infinity, -Infinity]) {
      expect(render(invalid, knockout)).toBe(expected)
    }
    expect(render(2, knockout)).not.toBe(expected)
  }
})
