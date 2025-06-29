import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

// Test that N_ prefix is rendered with overline

test("schematic inverted pin label", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <chip
        name="U1"
        footprint="soic8"
        pinLabels={{
          pin1: "N_CS",
          pin8: "VCC",
        }}
        connections={{
          pin1: "net.N_CS",
        }}
        schPortArrangement={{
          leftSide: { pins: [1], direction: "top-to-bottom" },
          rightSide: { pins: [8], direction: "top-to-bottom" },
        }}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  const svg = convertCircuitJsonToSchematicSvg(
    circuit.getCircuitJson() as AnyCircuitElement[],
  )

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
