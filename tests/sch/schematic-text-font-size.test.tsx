import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic text font size test!", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <schematictext
        fontSize={0.05}
        anchor="top_left"
        schX={0}
        schY={0}
        text="Test"
      />
      <schematictext
        fontSize={0.15}
        anchor="bottom_left"
        schX={0}
        schY={1}
        text="Test2"
      />
      <schematictext
        fontSize={0.18}
        anchor="center_right"
        schX={2}
        schY={1}
        text="Test3"
      />
      <schematictext
        fontSize={0.2}
        anchor="top_right"
        schX={0}
        schY={-1}
        text="Test4"
      />
      <schematictext
        fontSize={0.3}
        anchor="center_right"
        schX={-2}
        schY={-1}
        text="Test5"
      />
      <schematictext
        fontSize={0.4}
        anchor="bottom_right"
        schX={-1}
        schY={0}
        text="Test6"
      />
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
}, 10000)
