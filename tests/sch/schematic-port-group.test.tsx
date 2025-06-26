import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import type { AnyCircuitElement } from "circuit-json"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

// Ensure schematic ports are wrapped in groups

test("schematic port group", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <resistor
        name="R1"
        resistance="10"
        footprint="0402"
        symbolName="boxresistor_right"
      />
    </board>,
  )

  await circuit.renderUntilSettled()
  const svg = convertCircuitJsonToSchematicSvg(
    circuit.getCircuitJson() as AnyCircuitElement[],
  )

  expect(svg).toContain('class="schematic-port"')
  expect(svg).toContain("data-schematic-port-id")
})
