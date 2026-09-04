import { expect, test } from "bun:test"
import type { AnyCircuitElement, SchematicPort } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test(
  "schematic pin label with structured overline runs",
  async () => {
    const { circuit } = getTestFixture()

    circuit.add(
      <board width="10mm" height="10mm" routingDisabled>
        <chip
          name="U1"
          footprint="soic8"
          pinLabels={{ pin1: "GND", pin2: "ABCD", pin8: "VCC" }}
          schPortArrangement={{
            leftSide: { pins: [1, 2], direction: "top-to-bottom" },
            rightSide: { pins: [8], direction: "top-to-bottom" },
          }}
        />
      </board>,
    )

    await circuit.renderUntilSettled()

    const circuitJson = circuit.getCircuitJson() as AnyCircuitElement[]
    const abcdPort = circuitJson.find(
      (element): element is SchematicPort =>
        element.type === "schematic_port" &&
        element.display_pin_label === "ABCD",
    )

    if (!abcdPort) throw new Error("Expected an ABCD schematic port")
    ;(
      abcdPort as SchematicPort & {
        display_pin_label_text_runs: Array<{
          text: string
          overline?: boolean
        }>
      }
    ).display_pin_label_text_runs = [{ text: "ABCD", overline: true }]

    expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
      import.meta.path,
    )
  },
  { timeout: 30000 },
)
