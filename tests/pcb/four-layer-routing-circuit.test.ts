import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import fourLayerRoutingCircuit from "../assets/four-layer-routing-circuit.json"

test("four-layer-routing-circuit from JSON file", () => {
  const svg = convertCircuitJsonToPcbSvg(fourLayerRoutingCircuit as any)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
