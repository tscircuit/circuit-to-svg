import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb note dimension outside board expands svg bounds", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 10,
      height: 10,
      center: { x: 0, y: 0 },
    },
    {
      type: "pcb_note_dimension",
      pcb_note_dimension_id: "note_dimension_1",
      from: { x: 20, y: 0 },
      to: { x: 30, y: 0 },
      text: "10mm",
      font_size: 1.2,
      arrow_size: 0.8,
      offset_distance: 5,
      offset_direction: { x: 0, y: 1 },
    },
    {
      type: "pcb_note_dimension",
      pcb_note_dimension_id: "note_dimension_2",
      from: { x: -30, y: -20 },
      to: { x: -20, y: -20 },
      text: "10mm",
      font_size: 1,
      arrow_size: 1,
      offset_distance: 5,
      offset_direction: { x: 0, y: -1 },
    },
  ] as AnyCircuitElement[])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
