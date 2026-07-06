import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("four pin jumper with net labels", async () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <pinheader
        name="J1"
        pinCount={4}
        footprint="pinrow4"
        gender="male"
        schFacingDirection="left"
        pinLabels={{
          pin1: "SYNC",
          pin2: "CS",
          pin3: "MISO",
          pin4: "SCLK",
        }}
        connections={{
          SYNC: "net.SYNC",
          CS: "net.CS",
          MISO: "net.MISO",
          SCLK: "net.SCLK",
        }}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  expect(
    convertCircuitJsonToSchematicSvg(circuit.getCircuitJson(), {
      grid: {
        cellSize: 0.2,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
