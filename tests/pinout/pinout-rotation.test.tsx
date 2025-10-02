import { expect, test } from "bun:test"
import { convertCircuitJsonToPinoutSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("pinout rotation", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board
      outline={[
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 20 },
        { x: 0, y: 20 },
      ]}
    >
      <chip
        name="U1"
        pcbX={5}
        pcbY={15}
        footprint={"soic4"}
        pinLabels={{
          pin1: "VCC",
          pin2: "GND",
          pin3: "SCL",
          pin4: "SDA",
        }}
        pinAttributes={{ VCC: { includeInBoardPinout: true } }}
        pcbRotation={90}
      />
      <chip
        name="U2"
        pcbX={5}
        pcbY={5}
        footprint={"soic4"}
        pinLabels={{
          pin1: "VCC",
          pin2: "GND",
          pin3: "SCL",
          pin4: "SDA",
        }}
        pinAttributes={{ GND: { includeInBoardPinout: true } }}
        pcbRotation={0}
      />
      <chip
        name="U3"
        pcbX={15}
        pcbY={5}
        footprint={"soic4"}
        pinLabels={{
          pin1: "VCC",
          pin2: "GND",
          pin3: "SCL",
          pin4: "SDA",
        }}
        pinAttributes={{
          SDA: { includeInBoardPinout: true },
          SCL: { includeInBoardPinout: true },
        }}
        pcbRotation={-90}
      />
    </board>,
  )

  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()

  expect(convertCircuitJsonToPinoutSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
