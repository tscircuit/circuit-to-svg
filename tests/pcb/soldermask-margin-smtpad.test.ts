import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("solder mask margin renders correctly with positive and negative values", () => {
  // Note: soldermask_margin controls how the solder mask relates to the copper pad
  // Positive margin = mask extends beyond pad (less copper exposed)
  // Negative margin = mask is smaller than pad (spacing left out, copper visible around edges)
  const circuit: any = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 14,
      height: 10,
    },

    // Rectangle with positive margin (mask extends beyond pad)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_positive",
      shape: "rect",
      layer: "top",
      x: -4,
      y: 2,
      width: 1.6,
      height: 1.1,
      is_covered_with_solder_mask: true,
      soldermask_margin: 0.2,
    },

    // Rectangle with negative margin (spacing around copper, copper visible)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_negative",
      shape: "rect",
      layer: "top",
      x: -4,
      y: -2,
      width: 1.6,
      height: 1.1,
      is_covered_with_solder_mask: true,
      soldermask_margin: -0.15,
    },
    // Circle with positive margin
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_circle_positive",
      shape: "circle",
      layer: "top",
      x: 0,
      y: 2,
      radius: 0.75,
      is_covered_with_solder_mask: true,
      soldermask_margin: 0.15,
    },
    // Circle with negative margin
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_circle_negative",
      shape: "circle",
      layer: "top",
      x: 0,
      y: -2,
      radius: 0.75,
      is_covered_with_solder_mask: true,
      soldermask_margin: -0.2,
    },
    // Pill with positive margin
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_pill_positive",
      shape: "pill",
      layer: "top",
      x: 4,
      y: 2,
      width: 2.4,
      height: 1,
      radius: 0.5,
      is_covered_with_solder_mask: true,
      soldermask_margin: 0.1,
    },

    // Pill with negative margin
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_pill_negative",
      shape: "pill",
      layer: "top",
      x: 4,
      y: -2,
      width: 2.4,
      height: 1,
      radius: 0.5,
      is_covered_with_solder_mask: true,
      soldermask_margin: -0.12,
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
