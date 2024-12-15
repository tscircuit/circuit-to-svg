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
    <board width="20mm" height="20mm" pcbX={0} pcbY={0}>
      <chip name="U1" footprint="bga32" pcbX={0} pcbY={0} />
      <resistor
        resistance="1k"
        pcbX={-5}
        pcbY={5}
        name={"R1"}
        footprint={"0402"}
      />
      <chip name="U2" footprint="dip4" pcbX={5} pcbY={6} pcbRotation={0} />
      <pinheader
        footprint={"pinrow4"}
        pinCount={4}
        name="J1"
        pcbX={8}
        pcbY={-5}
        pcbRotation={90}
      />
      <capacitor
        name="C1"
        footprint="0805"
        capacitance="0.1"
        pcbX={-7}
        pcbY={-5}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  expect(
    convertCircuitJsonToAssemblySvg(circuitJson as any, {}),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(convertCircuitJsonToPcbSvg(circuitJson as any, {})).toMatchSvgSnapshot(
    `${import.meta.path} - pcb`,
  )
})
