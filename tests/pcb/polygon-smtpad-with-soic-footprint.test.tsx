import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { Circuit } from "@tscircuit/core"

test("polygon pad footprint renders with additional soic footprint", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width={20} height={20}>
      <chip
        name="U1"
        footprint={
          <footprint>
            <smtpad
              portHints={["pin2"]}
              points={[
                { x: "-0.22597110000015164mm", y: "-0.4744973999999047mm" },
                { x: "-0.585965299999998mm", y: "-0.4744973999999047mm" },
                { x: "-0.585965299999998mm", y: "-0.17447259999994458mm" },
                { x: "-0.40595550000011826mm", y: "-0.17447259999994458mm" },
                { x: "-0.22597110000015164mm", y: "-0.354482399999938mm" },
              ]}
              shape="polygon"
            />
            <smtpad
              portHints={["pin1"]}
              points={[
                { x: "-0.2259202999999843mm", y: "0.47553880000009485mm" },
                { x: "-0.5859145000001718mm", y: "0.47553880000009485mm" },
                { x: "-0.5859145000001718mm", y: "0.17551400000002104mm" },
                { x: "-0.4059047000000646mm", y: "0.17551400000002104mm" },
                { x: "-0.2259202999999843mm", y: "0.3555237999999008mm" },
              ]}
              shape="polygon"
            />
            <smtpad
              portHints={["pin4"]}
              points={[
                { x: "0.22597110000003795mm", y: "0.47454819999995834mm" },
                { x: "0.585965299999998mm", y: "0.47454819999995834mm" },
                { x: "0.585965299999998mm", y: "0.17452339999999822mm" },
                { x: "0.4059555000000046mm", y: "0.17452339999999822mm" },
                { x: "0.22597110000003795mm", y: "0.35453319999999167mm" },
              ]}
              shape="polygon"
            />
            <smtpad
              portHints={["pin3"]}
              points={[
                { x: "0.22597110000003795mm", y: "-0.47553879999998117mm" },
                { x: "0.585965299999998mm", y: "-0.47553879999998117mm" },
                { x: "0.585965299999998mm", y: "-0.17551399999990736mm" },
                { x: "0.4059555000000046mm", y: "-0.17551399999990736mm" },
                { x: "0.22597110000003795mm", y: "-0.3555238000000145mm" },
              ]}
              shape="polygon"
            />
            <smtpad
              portHints={["pin5"]}
              pcbX="0.0020701000000826753mm"
              pcbY="0.0005587999999079329mm"
              width="0.48000919999999997mm"
              height="0.48000919999999997mm"
              shape="rect"
            />
          </footprint>
        }
      />
      <chip name="U2" footprint="soic8" />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    backgroundColor: "transparent",
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
