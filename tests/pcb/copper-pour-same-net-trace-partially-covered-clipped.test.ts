import { expect, test } from "bun:test"
import circuitJson from "./assets/copper-pour-same-net-trace-partially-covered.json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("clipTracesInsideSameNetPours hides trace portions inside same-net pours", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    clipTracesInsideSameNetPours: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
