import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

// Verify that schematicText supports newline characters

test("schematic text with newline", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <schematictext schX={0} schY={0} text={"Line1\nLine2"} />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()
  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
