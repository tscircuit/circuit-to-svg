import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test(
  "long component display names stay inside the exported svg",
  async () => {
    const { circuit } = getTestFixture()

    circuit.add(
      <board width="10mm" height="10mm">
        <voltagesource
          name="V20_DC_IN_VERY_LONG_NAME"
          voltage={20}
          schRotation={-90}
        />
      </board>,
    )

    await circuit.renderUntilSettled()
    circuit.render()

    expect(
      // @ts-ignore
      convertCircuitJsonToSchematicSvg(circuit.getCircuitJson(), {
        grid: {
          cellSize: 1,
          labelCells: true,
        },
      }),
    ).toMatchSvgSnapshot(import.meta.path)
  },
  { timeout: 30000 },
)
