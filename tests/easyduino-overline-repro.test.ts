import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "../lib"
import circuitJson from "./assets/easyduino-overline.circuit.json"
import "bun-match-svg"

test("renders Easyduino active-low pin names and labels with overlines", () => {
  const svg = convertCircuitJsonToSchematicSvg(circuitJson as any, {
    width: 700,
    height: 800,
  })

  expect(svg).not.toContain("~{")
  expect(svg).toContain(
    '<tspan text-decoration="overline">RI</tspan><tspan>/CLK</tspan>',
  )
  expect(svg.match(/text-decoration="overline"/g)).toHaveLength(15)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
