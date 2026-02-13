import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("drawPorts option does not render circles for connected ports", async () => {
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
            <port name="OUT" direction="right" schX={1} schY={0} />
          </symbol>
        }
      />
      <chip
        name="U2"
        schX={4}
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
            <schematiccircle
              center={{ x: 0.65, y: 0 }}
              radius={0.15}
              strokeWidth={0.02}
              isFilled={false}
            />
            <schematicline x1={-1} y1={0} x2={-0.5} y2={0} strokeWidth={0.02} />
            <schematicline x1={0.8} y1={0} x2={1.3} y2={0} strokeWidth={0.02} />
            <port name="IN" direction="left" schX={3} schY={0} />
          </symbol>
        }
        connections={{
          IN: ".U1 > .OUT",
        }}
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
