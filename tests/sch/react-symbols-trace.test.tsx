import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("React symbols with traces using all schematic shapes", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board>
      <chip
        schX={2}
        schY={0}
        name="U1"
        symbol={
          <symbol name="U1">
            <schematicrect
              schX={0}
              schY={0}
              width={2}
              height={1}
              strokeWidth={0.05}
              isFilled={false}
            />
            <schematicline x1={1} y1={0} x2={1.5} y2={0} />
            <schematicline x1={-1} y1={0} x2={-1.5} y2={0} />
            <port name="pin1" direction="left" schX={1} schY={0} />
          </symbol>
        }
      />

      <chip
        schX={-2}
        schY={0}
        name="U2"
        symbol={
          <symbol name="U2">
            <schematicrect
              schX={0}
              schY={0}
              width={2}
              height={1}
              strokeWidth={0.05}
              isFilled={false}
            />
            <schematicline x1={1} y1={0} x2={1.5} y2={0} />
            <schematicline x1={-1} y1={0} x2={-1.5} y2={0} />
            <port name="pin1" direction="right" schX={1} schY={0} />
          </symbol>
        }
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  expect(
    convertCircuitJsonToSchematicSvg(circuit.getCircuitJson(), {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
