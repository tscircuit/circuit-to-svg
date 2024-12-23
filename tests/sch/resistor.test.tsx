import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic resistor", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor
        name="R1"
        resistance="10"
        footprint="0402"
        symbolName="boxresistor_horz"
      />
    </board>,
  )

  expect(
    // @ts-ignore
    convertCircuitJsonToSchematicSvg(
      circuit
        .getCircuitJson()
        // TEMPORARY HACK: until @tscircuit/core supports symbol_display_value
        .map((elm) => {
          if (elm.type === "schematic_component") {
            return {
              ...elm,
              symbol_display_value: "10Ω",
            }
          }
          return elm
        }) as AnyCircuitElement[],
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
