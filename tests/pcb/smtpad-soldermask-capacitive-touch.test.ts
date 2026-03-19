import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

/**
 * Demonstrates solder mask rendering for SMT pads in a capacitive touch slider
 * configuration. In this design, the polygon pads covered with solder mask act
 * as the dielectric layer — the solder mask (green overlay) covers the copper
 * pads so that capacitive coupling occurs through the mask.
 *
 * Verifies issue tscircuit/circuit-to-svg#314:
 * - When showSolderMask: true, pads with is_covered_with_solder_mask: true
 *   render a soldermask color overlay instead of bare copper
 * - Pads with is_covered_with_solder_mask: false (or unset) show bare copper
 */
test("smtpad solder mask renders correctly for capacitive touch slider pads", () => {
  const circuit: any = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 14,
      height: 6,
    },

    // Three diamond-shaped polygon pads covered with solder mask (capacitive touch segments)
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "touch_pad_1",
      shape: "polygon",
      layer: "top",
      points: [
        { x: -4, y: 0 },
        { x: -3, y: 1.2 },
        { x: -2, y: 0 },
        { x: -3, y: -1.2 },
      ],
      is_covered_with_solder_mask: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "touch_pad_2",
      shape: "polygon",
      layer: "top",
      points: [
        { x: -1, y: 0 },
        { x: 0, y: 1.2 },
        { x: 1, y: 0 },
        { x: 0, y: -1.2 },
      ],
      is_covered_with_solder_mask: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "touch_pad_3",
      shape: "polygon",
      layer: "top",
      points: [
        { x: 2, y: 0 },
        { x: 3, y: 1.2 },
        { x: 4, y: 0 },
        { x: 3, y: -1.2 },
      ],
      is_covered_with_solder_mask: true,
    },

    // One exposed (uncovered) rect pad for comparison — should show bare copper
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "exposed_pad",
      shape: "rect",
      layer: "top",
      x: 5.5,
      y: 0,
      width: 1.2,
      height: 1.2,
      is_covered_with_solder_mask: false,
    },
  ]

  const svgWithMask = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
  })

  const svgWithoutMask = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: false,
  })

  // With solder mask: covered pads should use soldermask color (not bare copper color)
  expect(svgWithMask).toContain("pcb-pad-covered")

  // Without solder mask: all pads render as normal copper (no covered class)
  expect(svgWithoutMask).not.toContain("pcb-pad-covered")

  // Snapshot for visual verification
  expect(svgWithMask).toMatchSvgSnapshot(import.meta.path)
})
