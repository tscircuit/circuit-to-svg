import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import circuitJson from "./assets/trace-enters-copper-pour-repro.json"

test("reproduces a marked same-net trace extending into a copper pour", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    includeVersion: false,
  })

  // This snapshot intentionally captures the current overshoot. The fix PR
  // updates it so the ground trace stops at the left edge of the pour.
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
