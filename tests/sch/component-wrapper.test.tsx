import { expect, test } from "bun:test"
import type { SchematicComponent } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("component wrapper has correct attributes", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor
        name="R1"
        resistance="10"
        footprint="0402"
        pcbX={-2}
        schX={-1}
        symbolName="boxresistor_horz"
      />
      <capacitor
        name="C1"
        capacitance="0.1"
        footprint="0402"
        pcbX={2}
        schX={2}
      />
      <trace from=".R1 > .pin2" to=".C1 > .pin1" />
      <pinheader
        name="pin1"
        schX={0}
        schY={-2}
        pinCount={10}
        pinLabels={[
          "pin1",
          "pin2",
          "pin3",
          "pin4",
          "pin5",
          "pin6",
          "pin7",
          "pin8",
          "pin9",
          "pin10",
        ]}
      />
      <chip
        name="U2"
        manufacturerPartNumber="ATmega8-16A"
        schX={5}
        schWidth={3}
        schHeight={7}
        schPinStyle={{
          pin29: { bottomMargin: 0.5 },
        }}
        pinLabels={{
          pin29: "RESET",
          pin13: "GND",
          pin2: "VCC",
          pin18: "OSC1",
        }}
        schPortArrangement={{
          leftSide: {
            pins: [29, 7, 8, 20, 19, 22],
            direction: "top-to-bottom",
          },
          topSide: {
            direction: "left-to-right",
            pins: [4, 18],
          },
          rightSide: {
            direction: "bottom-to-top",
            pins: [12, 13, 14, 15, 16, 17, 23],
          },
          bottomSide: {
            direction: "left-to-right",
            pins: [1, 2],
          },
        }}
      />
    </board>,
  )

  circuit.render()
  const circuitJson = circuit.getCircuitJson()
  const svg = convertCircuitJsonToSchematicSvg(circuitJson)


  expect(svg).toContain('data-circuit-json-type="schematic_component"')
  expect(svg).toContain('data-schematic-component-id')

  expect(svg).toContain('class="component-overlay"')
  expect(svg).toContain('fill="transparent"')
})
