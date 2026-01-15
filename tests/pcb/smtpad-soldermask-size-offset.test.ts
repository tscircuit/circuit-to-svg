import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("solder mask size and offset support for rect and rotated_rect", () => {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    // Standard rect pad with size and offset
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_offset",
      shape: "rect",
      layer: "top",
      x: -5,
      y: 5,
      width: 2,
      height: 1,
      is_covered_with_solder_mask: true,
      soldermask_width: 3,
      soldermask_height: 2,
      soldermask_center_offset: { x: 0.5, y: -0.5 },
    },
    // Rotated rect pad with size and offset
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rotated_rect_offset",
      shape: "rotated_rect",
      layer: "top",
      x: 5,
      y: 5,
      width: 2,
      height: 1,
      ccw_rotation: 45,
      is_covered_with_solder_mask: true,
      soldermask_width: 3,
      soldermask_height: 2,
      soldermask_center_offset: { x: 0.5, y: -0.5 },
    },
    // Standard rect pad with different offset (negative)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_offset_neg",
      shape: "rect",
      layer: "top",
      x: -5,
      y: -5,
      width: 2,
      height: 1,
      is_covered_with_solder_mask: true,
      soldermask_width: 3,
      soldermask_height: 2,
      soldermask_center_offset: { x: -0.5, y: 0.5 },
    },
    // Rotated rect pad with negative offset
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rotated_rect_offset_neg",
      shape: "rotated_rect",
      layer: "top",
      x: 5,
      y: -5,
      width: 2,
      height: 1,
      ccw_rotation: -30,
      is_covered_with_solder_mask: true,
      soldermask_width: 3,
      soldermask_height: 2,
      soldermask_center_offset: { x: -0.5, y: 0.5 },
    },
    // Pad size bigger than soldermask (small opening)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_small_mask",
      shape: "rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 4,
      height: 4,
      is_covered_with_solder_mask: true,
      soldermask_width: 2,
      soldermask_height: 2,
    },
    // Rotated pad with smaller soldermask and offset
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rotated_small_mask",
      shape: "rotated_rect",
      layer: "top",
      x: 0,
      y: -8,
      width: 4,
      height: 2,
      ccw_rotation: 15,
      is_covered_with_solder_mask: true,
      soldermask_width: 1,
      soldermask_height: 1,
      soldermask_center_offset: { x: 1, y: 0 },
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
