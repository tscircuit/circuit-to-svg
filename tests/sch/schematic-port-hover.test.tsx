import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic port hover group order", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor name="R1" resistance="10" footprint="0402" />
      <resistor name="R2" resistance="10" footprint="0402" schX={2} />
      <trace from=".R1 > .pin1" to=".R2 > .pin1" />
    </board>,
  )

  const svg = convertCircuitJsonToSchematicSvg(
    circuit.getCircuitJson() as AnyCircuitElement[],
  )

  const traceIndex = svg.indexOf("trace-invisible-hover-outline")
  const portHoverIndex = svg.indexOf("schematic-port-hover")
  expect(portHoverIndex).toBeGreaterThan(traceIndex)
  expect(svg).toContain("schematic-port-hover")
})
