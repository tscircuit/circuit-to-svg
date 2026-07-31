import { expect, test } from "bun:test"
import { convertCircuitJsonToSolderPasteMask } from "lib"

test("solder paste rotated pill", () => {
  const topCircuitJson = convertCircuitJsonToSolderPasteMask(
    [
      {
        type: "pcb_solder_paste",
        x: 0,
        y: 0,
        layer: "top",
        shape: "rotated_pill",
        width: 2 * 0.7,
        height: 1 * 0.7,
        radius: 0.5 * 0.7,
        ccw_rotation: 30,
        pcb_solder_paste_id: "solder_paste_0",
        pcb_component_id: "pcb_component_0",
      },
      {
        type: "pcb_solder_paste",
        x: 3,
        y: 0,
        layer: "top",
        shape: "rotated_pill",
        width: 2 * 0.7,
        height: 1 * 0.7,
        radius: 0.5 * 0.7,
        ccw_rotation: 90,
        pcb_solder_paste_id: "solder_paste_1",
        pcb_component_id: "pcb_component_1",
      },
    ],
    {
      layer: "top",
    },
  )
  expect(topCircuitJson).toMatchSvgSnapshot(import.meta.path + ".top")
})
