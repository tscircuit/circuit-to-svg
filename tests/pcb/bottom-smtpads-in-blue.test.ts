import { test, expect } from "bun:test"
import { circuitJsonToPcbSvg } from "src"

test("bottom trace is blue", () => {
  expect(
    circuitJsonToPcbSvg([
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
