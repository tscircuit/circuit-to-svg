import { test, expect } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic resistor", () => {
  const circuit = new Circuit()
  circuit.add(
    <board width="5mm" height="5mm">
      <resistor name="R1" resistance="1k" footprint="0402" />
    </board>,
  )

  expect(
    convertCircuitJsonToSchematicSvg(circuit.getCircuitJson()),
  ).toMatchSvgSnapshot(import.meta.path)
})
