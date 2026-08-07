import { expect, test } from "bun:test"
import circuitJson from "./assets/copper-pour-same-net-trace-partially-covered.json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("renders same-net trace through pour when clipping is off (default)", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
