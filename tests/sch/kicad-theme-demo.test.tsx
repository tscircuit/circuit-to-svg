import { expect, it } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

it("example 4: kicad theme demo", async () => {
  const { project } = getTestFixture()

  project.add(
    <board width="10mm" height="10mm">
      <resistor
        name="R1"
        resistance="10"
        footprint="0402"
        pcbX={-2}
        schX={-1}
        symbolName="boxresistor_horz"
      />
      <capacitor
        name="C1"
        capacitance="0.1"
        footprint="0402"
        pcbX={2}
        schX={2}
      />
      <trace from=".R1 > .pin2" to=".C1 > .pin1" />

      <chip
        name="U2"
        manufacturerPartNumber="ATmega8-16A"
        schX={5}
        schWidth={3}
        schHeight={7}
        schPinStyle={{
          pin29: { bottomMargin: 0.5 },
        }}
        schPortArrangement={{
          leftSide: {
            pins: [29, 7, 8, 20, 19, 22],
            direction: "top-to-bottom",
          },
          topSide: {
            direction: "left-to-right",
            pins: [4, 18],
          },
          rightSide: {
            direction: "bottom-to-top",
            pins: [12, 13, 14, 15, 16, 17, 23],
          },
        }}
      />
    </board>,
  )

  expect(
    // @ts-ignore
    convertCircuitJsonToSchematicSvg(project.getCircuitJson()),
  ).toMatchSvgSnapshot(import.meta.path)
})
