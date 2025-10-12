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
  route: [
    { x: -10, y: -2 },
    { x: -6, y: -1 },
    { x: -4, y: -3 },
    { x: -2, y: 0 },
  ],
  stroke_width: 0.25,
  color: "rgba(180, 255, 180, 0.9)",
}

test("pcb note primitives render", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    noteText,
    noteRect,
    noteLine,
    notePath,
  ])

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
