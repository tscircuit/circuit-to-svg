import { expect, test } from "bun:test"
import { convertCircuitJsonToAssemblySvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("assembly should render pads and holes", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="30mm" height="30mm">
      <chip name="U1" footprint="soic8" pcbX={-5} pcbY={5} />
      <pinheader
        name="P1"
        footprint={"pinrow4"}
        pinCount={4}
        pcbX={5}
        pcbY={5}
      />
      <chip
        name="H1"
        footprint={
          <footprint>
            <hole pcbX={0} pcbY={-5} diameter={1} />
          </footprint>
        }
      />
      <resistor
        name="R1"
        resistance="1k"
        footprint="0805"
        pcbX={-5}
        pcbY={-5}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  expect(
    convertCircuitJsonToAssemblySvg(circuitJson as any, {}),
  ).toMatchSvgSnapshot(import.meta.path)
})
