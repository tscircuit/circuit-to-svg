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

test("non-finite keepout radii render like zero without corrupting board bounds", () => {
  const render = (radius: number) =>
    convertCircuitJsonToPcbSvg([
      board,
      {
        type: "pcb_keepout",
        pcb_keepout_id: "keepout_0",
        shape: "circle",
        center: { x: 1, y: 2 },
        radius,
        layers: ["top", "bottom"],
      },
    ])

  const expected = render(0)
  expect(expected).not.toMatch(/NaN|Infinity/)
  for (const invalid of [NaN, Infinity, -Infinity]) {
    expect(render(invalid)).toBe(expected)
  }
  expect(render(3)).not.toBe(expected)
})
