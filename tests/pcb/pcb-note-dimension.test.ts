import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const dimension = {
  type: "pcb_note_dimension" as const,
  pcb_note_dimension_id: "note_dimension_1",
  from: { x: 0, y: 0 },
  to: { x: 12, y: 0 },
  text: "12.00 mm",
  font: "tscircuit2024" as const,
  font_size: 1.2,
  arrow_size: 0.8,
  offset_distance: 1,
  offset_direction: { x: 0, y: 1 },
}

const angledDimension = {
  type: "pcb_note_dimension" as const,
  pcb_note_dimension_id: "note_dimension_2",
  from: { x: 2, y: 2 },
  to: { x: 6, y: 6 },
  text: "5.66 mm",
  font: "tscircuit2024" as const,
  font_size: 1,
  arrow_size: 0.6,
  color: "rgba(0, 255, 255, 0.9)",
  offset_distance: 1.5,
  offset_direction: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
}

const rotatedDimension90 = {
  type: "pcb_note_dimension" as const,
  pcb_note_dimension_id: "note_dimension_3",
  from: { x: 0, y: -8 },
  to: { x: 10, y: -8 },
  text: "10.00 mm",
  font: "tscircuit2024" as const,
  font_size: 1.2,
  arrow_size: 0.8,
  offset_distance: 1,
  offset_direction: { x: 0, y: 1 },
  text_ccw_rotation: 90,
}

const rotatedDimension45 = {
  type: "pcb_note_dimension" as const,
  pcb_note_dimension_id: "note_dimension_4",
  from: { x: -10, y: 0 },
  to: { x: -2, y: 0 },
  text: "8.00 mm",
  font: "tscircuit2024" as const,
  font_size: 1.0,
  arrow_size: 0.7,
  offset_distance: 1,
  offset_direction: { x: 0, y: 1 },
  text_ccw_rotation: 45,
}

const rotatedDimension30 = {
  type: "pcb_note_dimension" as const,
  pcb_note_dimension_id: "note_dimension_7",
  from: { x: -10, y: -8 },
  to: { x: -4, y: -8 },
  text: "6.00 mm",
  font: "tscircuit2024" as const,
  font_size: 0.9,
  arrow_size: 0.6,
  offset_distance: 1,
  offset_direction: { x: 0, y: 1 },
  text_ccw_rotation: 30,
}

test("pcb note dimension renders", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    dimension,
    angledDimension,
    rotatedDimension90,
    rotatedDimension45,
    rotatedDimension30,
  ])
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
