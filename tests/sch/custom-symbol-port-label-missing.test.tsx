import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

const pinLabels = {
  pin1: ["GND"],
  pin2: ["VOUT1"],
  pin3: ["VIN"],
  pin4: ["VOUT2"],
} as const

test("custom symbol port label missing", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <chip
      name="AMS1117_3_3"
      pinLabels={pinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C6186"],
      }}
      symbol={
        <symbol>
          <schematicrect
            schX={0}
            schY={0}
            width={17.78}
            height={10.16}
            strokeWidth={0.254}
            color="#880000"
          />
          <schematiccircle
            center={{ x: -7.62, y: 3.81 }}
            radius={0.381}
            strokeWidth={0.254}
            color="#880000"
            isFilled
            fillColor="#880000"
          />
          <port
            name="pin1"
            pinNumber={1}
            aliases={["GND"]}
            direction="left"
            schX={-11.43}
            schY={2.54}
            schStemLength={2.54}
          />
          <port
            name="pin2"
            pinNumber={2}
            aliases={["VOUT1", "VOUT"]}
            direction="left"
            schX={-11.43}
            schY={0}
            schStemLength={2.54}
          />
          <port
            name="pin3"
            pinNumber={3}
            aliases={["VIN"]}
            direction="left"
            schX={-11.43}
            schY={-2.54}
            schStemLength={2.54}
          />
          <port
            name="pin4"
            pinNumber={4}
            aliases={["VOUT2", "VOUT"]}
            direction="right"
            schX={11.43}
            schY={0}
            schStemLength={2.54}
          />
        </symbol>
      }
      manufacturerPartNumber="AMS1117_3_3"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="2.92995985mm"
            pcbY="-2.29997mm"
            width="2.499995mm"
            height="1.0999978mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="2.92995985mm"
            pcbY="0mm"
            width="2.499995mm"
            height="1.0999978mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="2.92995985mm"
            pcbY="2.29997mm"
            width="2.499995mm"
            height="1.0999978mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="-3.00995715mm"
            pcbY="0mm"
            width="2.3400004mm"
            height="3.5999928mm"
            shape="rect"
          />
          <silkscreenpath
            route={[
              { x: -1.6114077499998984, y: -3.3262061999998878 },
              { x: -1.6114077499998984, y: 3.3262062000000014 },
              { x: 1.3313854499999707, y: 3.3262062000000014 },
              { x: 1.3313854499999707, y: -3.3262061999998878 },
              { x: -1.6114077499998984, y: -3.3262061999998878 },
            ]}
          />
          <silkscreentext
            text="{NAME}"
            pcbX="0.29178885mm"
            pcbY="4.3274mm"
            anchorAlignment="center"
            fontSize="1mm"
          />
          <courtyardoutline
            outline={[
              { x: -4.428611149999938, y: 3.5774000000000115 },
              { x: 5.012188849999916, y: 3.5774000000000115 },
              { x: 5.012188849999916, y: -3.5773999999998978 },
              { x: -4.428611149999938, y: -3.5773999999998978 },
              { x: -4.428611149999938, y: 3.5774000000000115 },
            ]}
          />
        </footprint>
      }
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C6186.obj?uuid=e80246a9471445bfb635be848806a22e",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C6186.step?uuid=e80246a9471445bfb635be848806a22e",
        pcbRotationOffset: 180,
        modelOriginPosition: {
          x: -0.14002385000003414,
          y: -0.000012700000070253736,
          z: -0.049394,
        },
      }}
    />,
  )
  const circuitJson = circuit.getCircuitJson()

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
