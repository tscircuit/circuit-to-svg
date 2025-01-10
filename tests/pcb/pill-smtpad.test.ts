import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pill smtpad shape", () => {
  expect(
    convertCircuitJsonToPcbSvg([
      {
        type: "pcb_smtpad",
        x: 0,
        y: 0,
        layer: "top" as const,
        shape: "pill",
        width: 1,
        height: 1,
        radius: 0.2,
        pcb_smtpad_id: "test_pad_1",
      },

      {
        type: "pcb_smtpad",
        x: 5,
        y: 5,
        layer: "top" as const,
        shape: "pill",
        width: 1.5,
        height: 1,
        radius: 0.3,
        pcb_smtpad_id: "test_pad_2",
      },

      {
        type: "pcb_smtpad",
        x: -5,
        y: -5,
        layer: "top" as const,
        shape: "pill",
        width: 1,
        height: 2,
        radius: 0.4,
        pcb_smtpad_id: "test_pad_3",
      },
    ]),
  ).toMatchSvgSnapshot(import.meta.path)
})
