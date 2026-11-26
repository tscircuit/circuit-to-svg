import type { PcbBoard, PcbFabricationNoteText } from "circuit-json"

export const fabricationTextBoard: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "fabrication_rotation_board",
  width: 100,
  height: 64,
  center: { x: 0, y: 0 },
  num_layers: 2,
  material: "fr4",
  thickness: 1.6,
}

export const fabricationTextNotes: PcbFabricationNoteText[] = (
  ["center", "top_left"] as const
).flatMap((alignment, row) =>
  [0, 90, 180, 270].map((angle, column) => ({
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: `${alignment}_${angle}`,
    pcb_component_id: "component",
    layer: "bottom",
    text: "R2 bottom",
    font: "tscircuit2024",
    font_size: 1,
    color: "#ffffff",
    anchor_position: { x: -36 + column * 24, y: 10 - row * 26 },
    anchor_alignment: alignment,
    ccw_rotation: angle,
  })),
)

export const fabricationTextCircuit = [
  fabricationTextBoard,
  ...fabricationTextNotes,
]
