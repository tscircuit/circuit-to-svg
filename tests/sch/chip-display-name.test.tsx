import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic chip uses display_name if available", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <chip
        name="U1"
        pinLabels={{
          1: "VCC",
          2: "GND",
        }}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson() as any[]

  // Find the source component for U1 and add display_name
  const u1Source = circuitJson.find(
    (elm) => elm.type === "source_component" && elm.name === "U1",
  )
  if (u1Source) {
    u1Source.display_name = "ChipDisplayName"
  }

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  expect(svg).toContain("ChipDisplayName")
  expect(svg).not.toContain(">U1<")
  expect(svg).toMatchSvgSnapshot(import.meta.path + "-chip-display-name")
})
