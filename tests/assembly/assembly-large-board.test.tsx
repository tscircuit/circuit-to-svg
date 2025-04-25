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
      {/* Create a 5x5 grid of resistors */}
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => (
          <resistor
            key={`resistor-${row}-${col}`}
            footprint="0402"
            name={`R${row}${col}`}
            resistance={1000 + (row * 5 + col) * 100}
            pcbX={-40 + col * 20}
            pcbY={-40 + row * 20}
          />
        )),
      )}

      {/* Create a 5x5 grid of capacitors */}
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => (
          <capacitor
            key={`capacitor-${row}-${col}`}
            footprint="2512"
            name={`C${row}${col}`}
            capacitance={`${1 + (row * 5 + col)}uF`}
            pcbX={-40 + col * 20}
            pcbY={-40 + row * 20 + 10}
          />
        )),
      )}

      {/* Create a 5x5 grid of capacitors */}
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => (
          <capacitor
            key={`capacitor-${row}-${col}`}
            footprint="0805"
            name={`C${row}${col}`}
            capacitance={`${1 + (row * 5 + col)}uF`}
            pcbX={-50 + col * 20}
            pcbY={-50 + row * 20 + 10}
          />
        )),
      )}

      {/* Add 10 chips in a row */}
      {Array.from({ length: 10 }).map((_, i) => (
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

      {/* Add 10 chips in a row */}
      {Array.from({ length: 10 }).map((_, i) => (
        <chip
          key={`chip-${i * 2}`}
          name={`U${i * 2}`}
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
