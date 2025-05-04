import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("solder paste for smtpads", () => {
  const circuitJson = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "pcb_solder_paste_0",
      layer: "top",
      shape: "rect",
      width: 0.42000000000000004,
      height: 0.42000000000000004,
      x: -2.5,
      y: 0,
      pcb_component_id: "pcb_component_0",
      pcb_smtpad_id: "pcb_smtpad_0",
    },

    {
      type: "pcb_solder_paste",
      x: 5,
      y: 0,
      layer: "top",
      shape: "rotated_rect",
      ccw_rotation: 45,
      width: 3 * 0.7,
      height: 1 * 0.7,
      pcb_smtpad_id: "smtpad_2",
      pcb_solder_paste_id: "solder_paste_2",
    },

    {
      type: "pcb_solder_paste",
      x: 0,
      y: 5,
      layer: "top",
      shape: "circle",
      radius: (2 / 2) * 0.7,
      pcb_solder_paste_id: "solder_paste_1",
      pcb_component_id: "pcb_component_0",
    },
    // pill shape
    {
      type: "pcb_solder_paste",
      x: 0,
      y: -5,
      layer: "top",
      shape: "pill",
      width: 2 * 0.7,
      height: 1 * 0.7,
      radius: 0.5 * 0.7,
      pcb_smtpad_id: "smtpad_3",
      pcb_solder_paste_id: "solder_paste_3",
    },
    // plated hole solder paste
    {
      type: "pcb_solder_paste",
      x: 0,
      y: 0,
      layer: "bottom",
      shape: "circle",
      radius: (2 / 2) * 0.7,
      pcb_solder_paste_id: "solder_paste_4",
      pcb_component_id: "pcb_component_0",
    },
  ])
  expect(circuitJson).toMatchSvgSnapshot(import.meta.path)
})
