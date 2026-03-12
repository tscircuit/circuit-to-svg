import { expect, test } from "bun:test"
import circuitJson from "./assets/copper-pour-same-net-trace-fully-covered.json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("renders copper pour where same-net trace is fully covered", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  expect(svg).not.toContain('data-type="pcb_trace"')
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
