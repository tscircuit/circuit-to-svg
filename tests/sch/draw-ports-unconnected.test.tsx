import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("drawPorts option renders port indicator circles for unconnected ports", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <chip
        name="U1"
        schX={0}
        schY={0}
        symbol={
          <symbol>
            <schematicline
              x1={-0.5}
              y1={-0.6}
              x2={-0.5}
              y2={0.6}
              strokeWidth={0.02}
            />
            <schematicline
              x1={-0.5}
              y1={0.6}
              x2={0.5}
              y2={0}
              strokeWidth={0.02}
            />
            <schematicline
              x1={0.5}
              y1={0}
              x2={-0.5}
              y2={-0.6}
              strokeWidth={0.02}
            />
            <schematicline x1={-1} y1={0} x2={-0.5} y2={0} strokeWidth={0.02} />
            <schematicline x1={0.5} y1={0} x2={1} y2={0} strokeWidth={0.02} />
            <port name="IN" direction="left" schX={-1} schY={0} />
            <port name="OUT" direction="right" schX={1} schY={0} />
          </symbol>
        }
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  expect(
    convertCircuitJsonToSchematicSvg(circuit.getCircuitJson(), {
      drawPorts: true,
      grid: { cellSize: 1, labelCells: true },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
