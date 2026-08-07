import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import circuitJson from "./assets/trace-enters-copper-pour-repro.json"

test("renders a marked same-net trace stopping at the copper pour boundary", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    includeVersion: false,
  })

  // The lower marked trace stops at the left pour edge. The upper unmarked
  // different-net trace remains visible across the pour as a control.
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
