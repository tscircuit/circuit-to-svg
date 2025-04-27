import { test, expect } from "bun:test"
import { createUseComponent, PinHeader } from "@tscircuit/core"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import {
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToPcbSvg,
} from "lib/index"

test("chip and resistor in assembly", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="100mm" height="100mm">
      {Array.from({ length: 2 }).map((_, col) => (
        <resistor
          key={`resistor-${col}`}
          footprint="0402"
          name={`R${col}`}
          resistance={1000 + col * 100}
          pcbX={-40 + col * 20}
          pcbY={-40}
        />
      ))}

      {Array.from({ length: 2 }).map((_, col) => (
        <capacitor
          key={`capacitor-${col}`}
          footprint="2512"
          name={`C${col}`}
          capacitance={`${1 + col}uF`}
          pcbX={-40 + col * 20}
          pcbY={-40 + 10}
        />
      ))}

      {Array.from({ length: 2 }).map((_, col) => (
        <capacitor
          key={`capacitor-${col}`}
          footprint="0805"
          name={`D${col}`}
          capacitance={`${1 + col}uF`}
          pcbX={-50 + col * 20}
          pcbY={-50 + 10}
        />
      ))}

      {Array.from({ length: 2 }).map((_, i) => (
        <chip
          key={`chip-${i}`}
          name={`U${i}`}
          pinLabels={{
            pin1: "D0",
            pin2: "D1",
            pin3: "D2",
            pin4: "GND",
            pin5: "D3",
            pin6: "EN",
            pin7: "D4",
            pin8: "VCC",
          }}
          footprint="soic16"
          pcbX={-45 + i * 10}
          pcbY={20}
        />
      ))}
      {Array.from({ length: 2 }).map((_, i) => (
        <chip
          key={`chip-${i}`}
          name={`E${i}`}
          pinLabels={{
            pin1: "D0",
            pin2: "D1",
            pin3: "D2",
            pin4: "GND",
            pin5: "D3",
            pin6: "EN",
            pin7: "D4",
            pin8: "VCC",
          }}
          layer="bottom"
          footprint="soic16"
          pcbX={-20 + i * 10}
          pcbY={20}
        />
      ))}

      {Array.from({ length: 2 }).map((_, i) => (
        <chip
          key={`chip-${i * 2}`}
          name={`F${i * 2}`}
          pinLabels={{
            pin1: "D0",
            pin2: "D1",
            pin3: "D2",
            pin4: "GND",
            pin5: "D3",
            pin6: "EN",
            pin7: "D4",
            pin8: "VCC",
          }}
          footprint="soic80"
          pcbX={-45 + i * 10}
          pcbY={5}
        />
      ))}
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  expect(
    convertCircuitJsonToAssemblySvg(circuitJson as any, {}),
  ).toMatchSvgSnapshot(import.meta.path)
})
