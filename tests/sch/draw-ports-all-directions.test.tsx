import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("draw ports with all directions", () => {
  const { circuit } = getTestFixture()
  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U1"
        schX={0}
        schY={0}
        symbol={
          <symbol>
            <schematicrect
              schX={0}
              schY={0}
              width={2}
              height={2}
              strokeWidth={0.02}
            />
            {/* Left port with stem line */}
            <port name="IN" schX={-1.6} schY={0.5} direction="left" />
            <schematicline
              x1={-1}
              y1={0.5}
              x2={-1.6}
              y2={0.5}
              strokeWidth={0.02}
            />
            {/* Right port with stem line */}
            <port name="OUT" schX={1.8} schY={0.5} direction="right" />
            <schematicline
              x1={1}
              y1={0.5}
              x2={1.8}
              y2={0.5}
              strokeWidth={0.02}
            />
            {/* Top port with stem line */}
            <port name="VCC" schX={0} schY={1.5} direction="up" />
            <schematicline x1={0} y1={1} x2={0} y2={1.5} strokeWidth={0.02} />
            {/* Bottom port with stem line */}
            <port name="GND" schX={0} schY={-1.4} direction="down" />
            <schematicline x1={0} y1={-1} x2={0} y2={-1.4} strokeWidth={0.02} />
          </symbol>
        }
      />
    </board>,
  )
  circuit.render()

  const svg = convertCircuitJsonToSchematicSvg(circuit.getCircuitJson(), {
    drawPorts: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
