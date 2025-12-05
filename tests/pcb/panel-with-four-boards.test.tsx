import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { Circuit } from "@tscircuit/core"

test("panel with four boards and anchor offsets", () => {
  const circuit = new Circuit()

  circuit.add(
    <panel width="100mm" height="100mm" pcbX={0} pcbY={0}>
      <board width="10mm" height="10mm" />
      <board width="10mm" height="10mm" />
      <board width="10mm" height="10mm" />
      <board width="10mm" height="10mm" />
    </panel>,
  )

  const circuitJson = circuit.getCircuitJson()

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    showAnchorOffsets: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
