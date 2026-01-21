import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test(
  "schematic inverter bubble",
  async () => {
    const { circuit } = getTestFixture()

    circuit.add(
      <board width="10mm" height="10mm" routingDisabled>
        <chip
          name="INV1"
          footprint="soic8"
          pinLabels={{
            pin1: "N_INV_EN",
            pin2: "INV_OUT",
            pin3: "N_IN",
          }}
          schPortArrangement={{
            leftSide: { pins: [1], direction: "top-to-bottom" },
            rightSide: { pins: [2, 3], direction: "top-to-bottom" },
          }}
        />
      </board>,
    )

    await circuit.renderUntilSettled()

    const svg = convertCircuitJsonToSchematicSvg(
      circuit.getCircuitJson() as AnyCircuitElement[],
    )

    expect(svg).toMatchSvgSnapshot(import.meta.path)
  },
  { timeout: 30000 },
)
