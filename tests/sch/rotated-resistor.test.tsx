import { test, expect } from "bun:test"
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

  console.log(
    circuit.getCircuitJson().filter((c) => c.type === "schematic_component"),
  )
  console.table(
    circuit
      .getCircuitJson()
      .filter((c) => c.type === "schematic_port")
      .map((a) => ({ ...a.center })),
  )

  expect(
    convertCircuitJsonToSchematicSvg(
      circuit.getCircuitJson().map((c) => {
        if (c.type !== "schematic_component") return c
        console.log(c)

        c.symbol_name = "boxresistor_vert"
        return c
      }),
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
