import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic resistor", () => {
  const { project } = getTestFixture()

  project.add(
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
    convertCircuitJsonToSchematicSvg(project.getCircuitJson()),
  ).toMatchSvgSnapshot(import.meta.path)
})
