import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("rotated rect smtpad shape", () => {
  expect(
    convertCircuitJsonToPcbSvg([
      {
        type: "pcb_smtpad",
        x: 0,
        y: 0,
        layer: "top" as const,
        shape: "rotated_rect",
        ccw_rotation: 45,
        width: 1,
        height: 1,
        pcb_smtpad_id: "test_pad_1",
      },
      {
        type: "pcb_smtpad",
        x: 2,
        y: 0,
        layer: "top" as const,
        shape: "rotated_rect",
        ccw_rotation: 90,
        width: 1,
        height: 2,
        pcb_smtpad_id: "test_pad_2",
      },
      {
        type: "pcb_smtpad",
        x: 4,
        y: 0,
        layer: "top" as const,
        shape: "rotated_rect",
        ccw_rotation: 170,
        width: 1,
        height: 1,
        pcb_smtpad_id: "test_pad_3",
      },
    ]),
  ).toMatchSvgSnapshot(import.meta.path)
})
