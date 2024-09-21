import { test, expect } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic chip", () => {
  const circuit = new Circuit()
  circuit.add(
    <board width="20mm" height="20mm">
      <chip name="U1" footprint="dip8" />
    </board>,
  )

  expect(
    convertCircuitJsonToSchematicSvg(circuit.getCircuitJson()),
  ).toMatchSvgSnapshot(import.meta.path)
})
