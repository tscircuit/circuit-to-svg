import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { Circuit } from "@tscircuit/core"

const circuit = new Circuit()

circuit.add(
  <board width="15mm" height="10mm">
    <coppertext text="Test Text" fontSize={1.5} anchorAlignment="center" />
    <coppertext
      text="Test Text"
      fontSize={1.5}
      anchorAlignment="center"
      layer="bottom"
      pcbY={-2}
    />
    <coppertext text="KOT1" fontSize={1.5} pcbY={2} knockout={true} />
    <coppertext
      text="KOT2"
      fontSize={1.5}
      pcbY={2}
      pcbX={-3}
      knockout={true}
      pcbRotation={45}
      layer="bottom"
    />
  </board>,
)

await circuit.renderUntilSettled()
const circuitJson = circuit.getCircuitJson()

test("copper text core", () => {
  expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
