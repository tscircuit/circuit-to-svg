import { expect, test } from "bun:test"
import circuitJson from "./assets/copper-pour-different-net.json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("renders copper pour with different-net traces", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
