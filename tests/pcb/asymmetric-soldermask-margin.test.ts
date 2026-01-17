import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

test("solder mask asymmetric margins renders correctly for rect and rotated_rect", () => {
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
    // Rect with asymmetric margins (positive)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_asymmetric_pos",
      shape: "rect",
      layer: "top",
      x: -5,
      y: 5,
      width: 2,
      height: 2,
      is_covered_with_solder_mask: true,
      soldermask_margin_left: 0.5,
      soldermask_margin_top: 0.1,
      soldermask_margin_right: 0.1,
      soldermask_margin_bottom: 0.5,
    },
    // Rect with asymmetric margins (negative)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_asymmetric_neg",
      shape: "rect",
      layer: "top",
      x: 5,
      y: 5,
      width: 2,
      height: 2,
      is_covered_with_solder_mask: true,
      soldermask_margin_left: -0.5,
      soldermask_margin_top: -0.1,
      soldermask_margin_right: -0.1,
      soldermask_margin_bottom: -0.5,
    },
    // Rotated Rect with asymmetric margins
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rotated_rect_asymmetric",
      shape: "rotated_rect",
      ccw_rotation: 45,
      layer: "top",
      x: -5,
      y: -5,
      width: 2,
      height: 4,
      is_covered_with_solder_mask: true,
      soldermask_margin_left: 1,
      soldermask_margin_top: 0.2,
      soldermask_margin_right: 0.2,
      soldermask_margin_bottom: 0.2,
    },
    // Rect with mixed margins (some nulled/default)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_mixed",
      shape: "rect",
      layer: "top",
      x: 5,
      y: -5,
      width: 2,
      height: 2,
      is_covered_with_solder_mask: true,
      soldermask_margin: 0.2,
      soldermask_margin_left: 0.8,
      // other margins should be 0.2
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
