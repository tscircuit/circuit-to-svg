import { expect, test } from "bun:test"
import circuitJson from "../assets/four-layer-routing-circuit.json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("renders four layer routing circuit", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
