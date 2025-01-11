import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pill smtpad shape", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_smtpad",
      x: 0,
      y: 0,
      layer: "top" as const,
      shape: "pill",
      width: 5,
      height: 2,
      radius: 1,
      pcb_smtpad_id: "test_pad_1",
    },
    {
      type: "pcb_smtpad",
      x: 3,
      y: 3,
      layer: "top" as const,
      shape: "pill",
      width: 4,
      height: 1,
      radius: 0.5,
      pcb_smtpad_id: "test_pad_2",
    },
    {
      type: "pcb_smtpad",
      x: -3,
      y: -3,
      layer: "top" as const,
      shape: "pill",
      width: 2,
      height: 1,
      radius: 0.5,
      pcb_smtpad_id: "test_pad_3",
    },
  ])

  console.log(result) // Log the result to debug
  expect(result).toMatchSvgSnapshot(import.meta.path)
})
