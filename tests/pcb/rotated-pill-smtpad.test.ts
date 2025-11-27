import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "../../lib/pcb/convert-circuit-json-to-pcb-svg"

test("renders rotated pill SMT pad with soldermask", () => {
  const circuit: any = [
    {
      type: "source_port",
      name: "via1",
      source_port_id: "source_port_1",
    },
    {
      type: "pcb_board",
      pcb_board_id: "board",
      width: 10,
      height: 10,
      center: { x: 0, y: 0 },
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_smtpad",
      x: -1,
      y: 0,
      layer: "top",
      shape: "rotated_pill",
      pcb_smtpad_id: "pcb_smt_pad_1",
      width: 2,
      height: 1,
      radius: 0.5,
      ccw_rotation: 45,
    },
    {
      type: "pcb_smtpad",
      x: 2,
      y: 0,
      layer: "top",
      shape: "rotated_pill",
      pcb_smtpad_id: "pcb_smt_pad_2",
      width: 2,
      height: 1,
      radius: 0.5,
      ccw_rotation: 0,
      is_covered_with_solder_mask: true,
    },
    {
      type: "pcb_smtpad",
      x: 0,
      y: -3,
      layer: "top",
      shape: "rotated_pill",
      pcb_smtpad_id: "pcb_smt_pad_3",
      width: 2,
      height: 1,
      radius: 0.5,
      ccw_rotation: -35,
    },
  ]
  expect(
    convertCircuitJsonToPcbSvg(circuit, {
      showSolderMask: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
