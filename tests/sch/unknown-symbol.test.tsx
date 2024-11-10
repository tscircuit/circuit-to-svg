import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic rotated resistor", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor
        name="R1"
        schX={-2}
        resistance="1k"
        footprint="0402"
        schRotation="0deg"
      />
      <resistor
        name="R2"
        schX={2}
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
        if (c.symbol_display_value === "10kΩ") {
          c.symbol_name = "INTENTIONALLY_NONEXISTENT_SYMBOL!!"
        }
        return c
      }),
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
