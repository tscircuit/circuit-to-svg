import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("bottom trace is blue", () => {
  expect(
    convertCircuitJsonToPcbSvg([
      {
        type: "pcb_smtpad",
        x: 0,
        y: 0,
        layer: "bottom" as const,
        shape: "rect",
        width: 1,
        height: 1,
        pcb_smtpad_id: "test_pad_1",
      },
    ]),
  ).toMatchSvgSnapshot(import.meta.path)
})
