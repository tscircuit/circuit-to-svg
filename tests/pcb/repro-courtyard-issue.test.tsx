import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { Circuit } from "@tscircuit/core"

test("repro-courtyard-issue", () => {
  const circuit = new Circuit()
  circuit.add(
    <board routingDisabled={true} layers={4} width="26.00mm" height="26.00mm">
      <chip
        name="chip-1"
        footprint="pinrow6"
        pcbX={-5}
        pcbY={0}
        pcbRotation={45.0}
        layer="bottom"
        manufacturerPartNumber="GENERIC"
      />
      <chip
        name="chip-2"
        footprint="pinrow6"
        pcbX={5}
        pcbY={0}
        pcbRotation={45.0}
        layer="top"
        manufacturerPartNumber="GENERIC"
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    showCourtyards: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
