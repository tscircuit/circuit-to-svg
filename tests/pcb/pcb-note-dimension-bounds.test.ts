import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

test("pcb_note_dimension outside of board should be included in SVG bounds", () => {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      material: "fr4",
      num_layers: 2,
      thickness: 1.2,
      width: 10,
      height: 10,
    },
    {
      type: "pcb_note_dimension",
      pcb_note_dimension_id: "dim1",
      from: { x: -20, y: 15 },
      to: { x: 20, y: 15 },
      text: "40mm",
      font: "tscircuit2024" as const,
      font_size: 1,
      arrow_size: 1,
      offset_distance: 5,
      offset_direction: { x: 0, y: 1 },
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit, {
    drawPaddingOutsideBoard: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("pcb_fabrication_note_dimension outside of board should be included in SVG bounds", () => {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 10,
      material: "fr4",
      num_layers: 2,
      thickness: 1.2,
      height: 10,
    },
    {
      type: "pcb_fabrication_note_dimension",
      pcb_fabrication_note_dimension_id: "fab_dim1",
      from: { x: -20, y: -15 },
      to: { x: 20, y: -15 },
      text: "40mm",
      layer: "top",
      pcb_component_id: "pcb_component_0",
      font: "tscircuit2024" as const,
      font_size: 1,
      arrow_size: 1,
      offset_distance: 5,
      offset_direction: { x: 0, y: -1 },
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit, {
    drawPaddingOutsideBoard: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path, "fab-note-dimension")
})
