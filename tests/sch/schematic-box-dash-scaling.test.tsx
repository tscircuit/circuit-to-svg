import { expect, test } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

// Ensure dashed schematic boxes scale correctly at different zoom levels

test("schematic box dash scaling", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <schematicbox
        width={4}
        height={4}
        schX={0}
        schY={0}
        strokeStyle="dashed"
      />
    </board>,
  )

  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson as any, {
      width: 600,
      height: 300,
    }),
  ).toMatchSvgSnapshot(`${import.meta.path} - small`)

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson as any, {
      width: 1200,
      height: 600,
    }),
  ).toMatchSvgSnapshot(`${import.meta.path} - large`)
}, 20000)
