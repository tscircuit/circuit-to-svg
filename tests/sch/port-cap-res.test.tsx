import { test, expect } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("Port schStemLength in custom symbol with width/height scaling connecting to capacitor", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <capacitor name="C1" capacitance="10uf" />
      <resistor name="R1" resistance="10" />
    </board>,
  )

  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()
  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: { cellSize: 0.5, labelCells: true },
      drawPorts: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
