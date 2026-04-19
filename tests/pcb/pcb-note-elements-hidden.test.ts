import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const board = {
  type: "pcb_board" as const,
  pcb_board_id: "board",
  width: 30,
  height: 20,
  center: { x: 0, y: 0 },
  num_layers: 2,
  material: "fr4" as const,
  thickness: 1.6,
}

const noteText = {
  type: "pcb_note_text" as const,
  pcb_note_text_id: "note_text_1",
  layer: "top" as const,
  text: "Assembly\nNote",
  font: "tscircuit2024" as const,
  font_size: 1.2,
  anchor_position: { x: -6, y: 4 },
  anchor_alignment: "top_left" as const,
  color: "rgba(255, 220, 180, 0.9)",
}

const noteRect = {
  type: "pcb_note_rect" as const,
  pcb_note_rect_id: "note_rect_1",
  layer: "top" as const,
  center: { x: 6, y: 2 },
  width: 6,
  height: 4,
  stroke_width: 0.2,
  is_filled: true,
  has_stroke: true,
  is_stroke_dashed: true,
  color: "rgba(0, 200, 255, 0.8)",
}

const noteLine = {
  type: "pcb_note_line" as const,
  pcb_note_line_id: "note_line_1",
  layer: "top" as const,
  x1: -8,
  y1: -4,
  x2: 8,
  y2: -4,
  stroke_width: 0.3,
  color: "rgba(255, 255, 120, 0.9)",
  is_dashed: true,
}

const notePath = {
  type: "pcb_note_path" as const,
  pcb_note_path_id: "note_path_1",
  layer: "top" as const,
  route: [
    { x: -10, y: -2 },
    { x: -6, y: -1 },
    { x: -4, y: -3 },
    { x: -2, y: 0 },
  ],
  stroke_width: 0.25,
  color: "rgba(180, 255, 180, 0.9)",
}

const noteDimension = {
  type: "pcb_note_dimension" as const,
  pcb_note_dimension_id: "note_dimension_1",
  layer: "top" as const,
  from: { x: 0, y: 0 },
  to: { x: 12, y: 0 },
  text: "12.00 mm",
  font: "tscircuit2024" as const,
  font_size: 1.2,
  arrow_size: 0.8,
  offset_distance: 1,
  offset_direction: { x: 0, y: 1 },
}

const circuitWithPcbNotes = [
  board,
  noteText,
  noteRect,
  noteLine,
  notePath,
  noteDimension,
]

test("showPcbNotes false hides pcb note primitives", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitWithPcbNotes, {
    showPcbNotes: false,
  })

  expect(svg).not.toContain('data-type="pcb_note_text"')
  expect(svg).not.toContain('data-type="pcb_note_rect"')
  expect(svg).not.toContain('data-type="pcb_note_line"')
  expect(svg).not.toContain('data-type="pcb_note_path"')
  expect(svg).not.toContain('data-type="pcb_note_dimension"')
  expect(svg).not.toContain("pcb-note-text")
  expect(svg).not.toContain("pcb-note-rect")
  expect(svg).not.toContain("pcb-note-line")
  expect(svg).not.toContain("pcb-note-path")
  expect(svg).not.toContain("pcb-note-dimension")
})
