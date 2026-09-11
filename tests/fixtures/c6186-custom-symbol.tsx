import { getTestFixture } from "./get-test-fixture"

// JLCPCB C6186: https://jlcpcb.com/partdetail/AMS1117-3.3/C6186
// Symbol geometry from tests/sch/custom-symbol-port-label-missing.test.tsx.
export const getC6186CustomSymbolCircuit = () => {
  const { circuit } = getTestFixture()
  circuit.add(
    <chip
      name="U739"
      manufacturerPartNumber="AMS1117-3.3"
      supplierPartNumbers={{ jlcpcb: ["C6186"] }}
      pinLabels={{
        pin1: ["GND"],
        pin2: ["VOUT1"],
        pin3: ["VIN"],
        pin4: ["VOUT2"],
      }}
      symbol={
        <symbol width={4} height={2}>
          <schematicrect
            schX={0}
            schY={0}
            width={17.78}
            height={10.16}
            strokeWidth={0.03}
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
    />,
  )
  return circuit.getCircuitJson()
}
