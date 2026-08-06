import { expect, test } from "bun:test"
import circuitJson from "./assets/copper-pour-same-net-trace-partially-covered.json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("hides the portion of a same-net trace inside a copper pour", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
