import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic rotated resistor", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor
        name="R1"
        resistance="10k"
        footprint="0402"
        schRotation="0deg"
      />
    </board>,
  )

  expect(
    convertCircuitJsonToSchematicSvg(
      circuit.getCircuitJson().map((c) => {
        if (c.type !== "schematic_component") return c

        return {
          ...c,
          symbol_name: "boxresistor_vert",
        }
      }) as AnyCircuitElement[],
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
