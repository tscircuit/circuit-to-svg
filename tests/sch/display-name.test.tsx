import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("schematic component uses display_name if available (ResistorDisplayName)", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <resistor
        name="R1"
        resistance="10"
        footprint="0402"
        symbolName="boxresistor_right"
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson() as any[]

  // Find the source component for R1 and add display_name
  const r1Source = circuitJson.find(
    (elm) => elm.type === "source_component" && elm.name === "R1",
  )
  if (r1Source) {
    r1Source.display_name = "ResistorDisplayName"
  }

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  expect(svg).toContain("ResistorDisplayName")
  expect(svg).not.toContain(">R1<") // The text R1 should be replaced, though attributes might still have it
  expect(svg).toMatchSvgSnapshot(import.meta.path + "-with-display-name")
})
