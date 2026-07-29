import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test.failing("pcb_copper_text SVG includes data-pcb-layer attribute", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "ct1",
      pcb_component_id: "comp1",
      font: "tscircuit2024",
      font_size: 1,
      text: "DEBUG",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
    },
  ])

  expect(svg).toContain('data-pcb-layer="top"')
})

test("pcb_copper_text and silkscreen overlap snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "ct1",
      pcb_component_id: "comp1",
      font: "tscircuit2024",
      font_size: 1,
      text: "COPPER",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "st1",
      pcb_component_id: "comp1",
      font: "tscircuit2024",
      font_size: 1,
      text: "SILK",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
    },
  ])

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
