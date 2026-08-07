import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import circuitJson from "./assets/trace-enters-copper-pour-repro.json"

test("renders traces stopping at the copper pour boundary", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    includeVersion: false,
  })

  // The marked lower trace is clipped exactly at the boundary. The unmarked
  // upper trace is masked wherever the finalized pour geometry covers it.
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
