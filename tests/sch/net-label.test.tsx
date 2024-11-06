import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic net label", () => {
  const { project } = getTestFixture()

  project.add(
    <board width="10mm" height="10mm">
      <netalias net="GND" schX="1mm" schY="1mm" />
    </board>,
  )

  expect(
    // @ts-ignore
    convertCircuitJsonToSchematicSvg(project.getCircuitJson()),
  ).toMatchSvgSnapshot(import.meta.path)
})
