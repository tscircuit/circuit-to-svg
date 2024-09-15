import { test, expect } from "bun:test"
import { circuitJsonToPcbSvg } from "src"
import { Circuit } from "@tscircuit/core"

test("fabrication note path and fabrication note text", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <fabricationnotepath
        color="blue"
        route={[
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          {
            x: 10,
            y: 10,
          },
          {
            x: 0,
            y: 0,
          },
        ]}
      />
      <fabricationnotetext
        color="#0000ff"
        anchorAlignment="bottom_left"
        text="hello world!"
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const svg = circuitJsonToPcbSvg(circuitJson as any)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
