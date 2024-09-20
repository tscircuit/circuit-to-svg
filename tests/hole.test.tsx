import { test, expect } from "bun:test"
import { circuitJsonToPcbSvg } from "src"
import { Circuit } from "@tscircuit/core"

test("should render a hole", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="22mm" height="22mm">
      <chip
        name="foo"
        footprint={
          <footprint>
            <smtpad
              pcbX={0}
              pcbY={0}
              shape="rect"
              width={1}
              height={1}
              portHints={["1"]}
            />
            <hole pcbX={5} pcbY={0} diameter={1} />
          </footprint>
        }
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  console.log(circuitJson)

  const svg = circuitJsonToPcbSvg(circuitJson as any)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
