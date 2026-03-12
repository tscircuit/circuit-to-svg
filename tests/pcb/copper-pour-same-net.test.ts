import { expect, test } from "bun:test"
import circuitJson from "./assets/copper-pour-same-net.json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("renders copper pour with same-net trace", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
