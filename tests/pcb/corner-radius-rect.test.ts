import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuit: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
  },

  {
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: "pcb_fabrication_note_rect_0",
    pcb_component_id: null,
    center: { x: -5, y: -5 },
    width: 6,
    height: 4,
    stroke_width: 0.2,
    is_filled: true,
    is_stroke_dashed: true,
    layer: "top",
    corner_radius: 0.3,
  },
  {
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: "pcb_fabrication_note_rect_0",
    pcb_component_id: null,
    center: { x: -6, y: 6 },
    width: 5,
    height: 3,
    stroke_width: 0.3,
    is_filled: true,
    color: "#0000ff",
    layer: "top",
    corner_radius: 0.2,
  },
  {
    type: "pcb_silkscreen_rect",
    layer: "top" as const,
    pcb_component_id: "pcb_component_1",
    pcb_silkscreen_rect_id: "rect_1",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    stroke_width: 0.1,
    corner_radius: 0.2,
  },
  {
    type: "pcb_note_rect",
    pcb_note_rect_id: "note_rect_1",
    center: { x: 6, y: 6 },
    width: 6,
    height: 4,
    stroke_width: 0.2,
    is_filled: true,
    has_stroke: true,
    is_stroke_dashed: true,
    color: "rgba(0, 200, 255, 0.8)",
    corner_radius: 0.4,
  },
]

test("pcb ", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, { showCourtyards: true })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
