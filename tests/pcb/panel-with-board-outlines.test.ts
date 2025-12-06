import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

test("panel with four boards with different outlines", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel_with_outlines",
      width: 100,
      height: 100,
      center: { x: 50, y: 50 },
      covered_with_solder_mask: false,
    },
    // Board 1: Top-left quadrant, simple rectangle outline
    {
      type: "pcb_board",
      pcb_board_id: "board_1_rect",
      center: { x: 25, y: 75 },
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      outline: [
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: 10, y: 10 },
        { x: -10, y: 10 },
      ],
    },
    // Board 2: Top-right, C-shape outline
    {
      type: "pcb_board",
      pcb_board_id: "board_2_c_shape",
      center: { x: 75, y: 75 },
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      outline: [
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 },
        { x: -10, y: 0 },
      ],
    },
    // Board 3: Bottom-left, T-shape outline
    {
      type: "pcb_board",
      pcb_board_id: "board_3_t_shape",
      center: { x: 25, y: 25 },
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      outline: [
        { x: -10, y: 0 },
        { x: -10, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: -10 },
        { x: -3, y: -10 },
        { x: -3, y: 0 },
      ],
    },
    // Board 4: Bottom-right, Octagon outline
    {
      type: "pcb_board",
      pcb_board_id: "board_4_octagon",
      center: { x: 75, y: 25 },
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      outline: [
        { x: -5, y: -10 },
        { x: 5, y: -10 },
        { x: 10, y: -5 },
        { x: 10, y: 5 },
        { x: 5, y: 10 },
        { x: -5, y: 10 },
        { x: -10, y: 5 },
        { x: -10, y: -5 },
      ],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
