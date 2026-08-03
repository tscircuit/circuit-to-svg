import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuit: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  },
  {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "courtyard0",
    pcb_component_id: "component0",
    center: { x: -2.3, y: 0 },
    width: 3,
    height: 3,
    layer: "top",
  },
  {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "courtyard1",
    pcb_component_id: "component0",
    center: { x: 2.3, y: 0 },
    width: 3,
    height: 3,
    layer: "bottom",
  },
  {
    type: "pcb_note_text",
    pcb_note_text_id: "top_label",
    text: "TOP (magenta)",
    font: "tscircuit2024",
    font_size: 0.45,
    anchor_position: { x: -2.3, y: 2.3 },
    anchor_alignment: "center",
    layer: "top",
    color: "#FF00FF",
  },
  {
    type: "pcb_note_text",
    pcb_note_text_id: "bottom_label",
    text: "BOTTOM (cyan)",
    font: "tscircuit2024",
    font_size: 0.45,
    anchor_position: { x: 2.3, y: 2.3 },
    anchor_alignment: "center",
    layer: "top",
    color: "rgb(38, 233, 255)",
  },
]

test("pcb courtyard rect", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, { showCourtyards: true })

  const topCourtyard = svg.match(
    /<rect[^>]*data-pcb-courtyard-rect-id="courtyard0"[^>]*>/,
  )?.[0]
  const bottomCourtyard = svg.match(
    /<rect[^>]*data-pcb-courtyard-rect-id="courtyard1"[^>]*>/,
  )?.[0]

  expect(topCourtyard).toContain("pcb-courtyard-top")
  expect(topCourtyard).toContain('data-pcb-layer="top"')
  expect(topCourtyard).toContain('stroke="#FF00FF"')
  expect(bottomCourtyard).toContain("pcb-courtyard-bottom")
  expect(bottomCourtyard).toContain('data-pcb-layer="bottom"')
  expect(bottomCourtyard).toContain('stroke="rgb(38, 233, 255)"')
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
