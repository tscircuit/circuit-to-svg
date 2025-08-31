import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToPcbSvg } from "lib"

test("fabrication note path and fabrication note text", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="22mm" height="22mm">
      <fabricationnotepath
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
      <fabricationnotetext anchorAlignment="bottom_left" text="hello world!" />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
