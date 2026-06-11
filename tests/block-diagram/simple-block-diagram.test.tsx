import { expect, test } from "bun:test"
import {
  convertCircuitJsonToBlockDiagramSvg,
  convertCircuitJsonToSchematicSvg,
} from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("simple circuit block diagram compared to schematic", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="18mm" height="14mm" routingDisabled schTraceAutoLabelEnabled>
      <chip
        name="U1"
        footprint="soic8"
        schX={0}
        schY={0}
        pinLabels={{
          pin1: "VDD",
          pin2: "GND",
          pin3: "SDA",
          pin4: "SCL",
          pin5: "MOSI",
          pin6: "MISO",
          pin7: "SCK",
          pin8: "CS",
        }}
      />
      <capacitor
        name="C1"
        capacitance="100nF"
        footprint="0402"
        schX={-3}
        schY={1.8}
      />
      <resistor
        name="R1"
        resistance="4.7k"
        footprint="0402"
        schX={3}
        schY={-1.8}
      />

      <trace from="U1.VDD" to="net.VDD" />
      <trace from="U1.GND" to="net.GND" />
      <trace from="C1.pin1" to="net.VDD" />
      <trace from="C1.pin2" to="net.GND" />
      <trace from="R1.pin1" to="net.VDD" />
      <trace from="R1.pin2" to="U1.SDA" />
      <trace from="U1.SCL" to="net.SCL" />
    </board>,
  )

  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson as any, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-schematic`)

  expect(
    convertCircuitJsonToBlockDiagramSvg(circuitJson as any, {
      width: 900,
      height: 520,
    }),
  ).toMatchSvgSnapshot(`${import.meta.path}-block`)
})
