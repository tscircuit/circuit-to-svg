import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "../lib"
import circuitJson from "./assets/easyduino-overline.circuit.json"
import "bun-match-svg"

test("repro: Easyduino active-low labels lose their overlines", () => {
  const svg = convertCircuitJsonToSchematicSvg(circuitJson as any, {
    width: 700,
    height: 800,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
