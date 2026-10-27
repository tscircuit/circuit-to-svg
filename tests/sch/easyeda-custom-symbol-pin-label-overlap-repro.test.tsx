import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

/**
 * These symbols use representative geometry copied from real EasyEDA imports.
 * Footprints, CAD models, and primitives unrelated to the overlap are omitted
 * because this regression only concerns schematic port-label rendering.
 */
test("EasyEDA custom symbol pin labels overlap symbol graphics", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <chip
      name="U_ESD"
      schX={-5.4}
      schY={0}
      manufacturerPartNumber="USBLC6-2SC6"
      supplierPartNumbers={{ jlcpcb: ["C7519"] }}
      pinLabels={{
        pin1: ["DM_IN"],
        pin2: ["GND"],
        pin3: ["DP_IN"],
        pin4: ["DP_OUT"],
        pin5: ["VBUS"],
        pin6: ["DM_OUT"],
      }}
      symbol={
        <symbol>
          <schematicrect
            schX={0}
            schY={0}
            width={1.8}
            height={2}
            color="#880000"
          />
          <port
            name="pin1"
            pinNumber={1}
            aliases={["DM_IN"]}
            direction="left"
            schX={-1.3}
            schY={0.6}
            schStemLength={0.4}
          />
          <port
            name="pin2"
            pinNumber={2}
            aliases={["GND"]}
            direction="left"
            schX={-1.3}
            schY={0}
            schStemLength={0.4}
          />
          <port
            name="pin3"
            pinNumber={3}
            aliases={["DP_IN"]}
            direction="left"
            schX={-1.3}
            schY={-0.6}
            schStemLength={0.4}
          />
          <port
            name="pin4"
            pinNumber={4}
            aliases={["DP_OUT"]}
            direction="right"
            schX={1.3}
            schY={-0.6}
            schStemLength={0.4}
          />
          <port
            name="pin5"
            pinNumber={5}
            aliases={["VBUS"]}
            direction="right"
            schX={1.3}
            schY={0}
            schStemLength={0.4}
          />
          <port
            name="pin6"
            pinNumber={6}
            aliases={["DM_OUT"]}
            direction="right"
            schX={1.3}
            schY={0.6}
            schStemLength={0.4}
          />
          <schematicpath
            points={[
              { x: -0.9, y: 0.6 },
              { x: 0.9, y: 0.6 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: -0.9, y: 0 },
              { x: 0.9, y: 0 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: -0.9, y: -0.6 },
              { x: 0.9, y: -0.6 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            svgPath="M -0.46 0.28 L -0.26 0.4 L -0.46 0.54 Z"
            strokeColor="#880000"
            isFilled
            fillColor="#880000"
          />
          <schematicpath
            svgPath="M 0.22 0.28 L 0.42 0.4 L 0.22 0.54 Z"
            strokeColor="#880000"
            isFilled
            fillColor="#880000"
          />
          <schematicpath
            svgPath="M -0.48 -0.52 L -0.28 -0.4 L -0.48 -0.26 Z"
            strokeColor="#880000"
            isFilled
            fillColor="#880000"
          />
          <schematicpath
            svgPath="M 0.22 -0.52 L 0.42 -0.4 L 0.22 -0.26 Z"
            strokeColor="#880000"
            isFilled
            fillColor="#880000"
          />
        </symbol>
      }
    />,
  )

  circuit.add(
    <chip
      name="X_CRYSTAL"
      schX={-1.8}
      schY={0}
      manufacturerPartNumber="S47SMD32.000M10PF10R30B3"
      supplierPartNumbers={{ jlcpcb: ["C5346074"] }}
      pinLabels={{ pin1: ["OSC1"], pin2: ["OSC2"] }}
      symbol={
        <symbol>
          <schematicpath
            points={[
              { x: 0.06, y: 0.14 },
              { x: 0.06, y: -0.14 },
              { x: -0.06, y: -0.14 },
              { x: -0.06, y: 0.14 },
              { x: 0.06, y: 0.14 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: -0.1, y: -0.14 },
              { x: -0.1, y: 0.14 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: 0.1, y: -0.14 },
              { x: 0.1, y: 0.14 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: -0.2, y: 0 },
              { x: -0.12, y: 0 },
            ]}
            strokeColor="#000000"
          />
          <schematicpath
            points={[
              { x: 0.2, y: 0 },
              { x: 0.12, y: 0 },
            ]}
            strokeColor="#000000"
          />
          <port
            name="pin1"
            pinNumber={1}
            aliases={["OSC1"]}
            direction="left"
            schX={-0.4}
            schY={0}
            schStemLength={0.2}
          />
          <port
            name="pin2"
            pinNumber={2}
            aliases={["OSC2"]}
            direction="right"
            schX={0.4}
            schY={0}
            schStemLength={0.2}
          />
        </symbol>
      }
    />,
  )

  circuit.add(
    <chip
      name="ANT_VERTICAL"
      schX={1.2}
      schY={0}
      manufacturerPartNumber="2450AT18A100E"
      supplierPartNumbers={{ jlcpcb: ["C89334"] }}
      pinLabels={{ pin1: ["ANT"], pin2: ["GND"] }}
      symbol={
        <symbol>
          <schematicpath
            points={[
              { x: 0, y: 0 },
              { x: -0.2, y: 0.2 },
            ]}
            strokeColor="#8D2323"
          />
          <schematicpath
            points={[
              { x: 0.2, y: 0.2 },
              { x: 0, y: 0 },
            ]}
            strokeColor="#8D2323"
          />
          <schematicpath
            points={[
              { x: 0, y: 0 },
              { x: 0, y: -0.2 },
            ]}
            strokeColor="#8D2323"
          />
          <port
            name="pin1"
            pinNumber={1}
            aliases={["ANT"]}
            direction="down"
            schX={0}
            schY={-0.4}
            schStemLength={0.2}
          />
          <schematicpath
            points={[
              { x: 0, y: 0 },
              { x: 0, y: 0.3 },
            ]}
            strokeColor="#880000"
          />
          <port
            name="pin2"
            pinNumber={2}
            aliases={["GND"]}
            direction="up"
            schX={0}
            schY={0.5}
            schStemLength={0.2}
          />
        </symbol>
      }
    />,
  )

  circuit.add(
    <chip
      name="ENC_ROTARY"
      schX={4.6}
      schY={0}
      manufacturerPartNumber="EC05E1220202"
      supplierPartNumbers={{ jlcpcb: ["C202421"] }}
      pinLabels={{
        pin4: ["SW_A"],
        pin5: ["SW_B"],
        pin6: ["A"],
        pin7: ["C"],
        pin8: ["B"],
      }}
      symbol={
        <symbol>
          <schematicpath
            points={[
              { x: -0.28, y: -0.08 },
              { x: -0.28, y: -0.34 },
              { x: 0.3, y: -0.34 },
              { x: 0.3, y: -0.08 },
            ]}
            strokeColor="#880000"
          />
          <port
            name="pin6"
            pinNumber={6}
            aliases={["A"]}
            direction="down"
            schX={0.2}
            schY={-0.6}
            schStemLength={0.2}
          />
          <port
            name="pin8"
            pinNumber={8}
            aliases={["B"]}
            direction="down"
            schX={-0.2}
            schY={-0.6}
            schStemLength={0.2}
          />
          <port
            name="pin7"
            pinNumber={7}
            aliases={["C"]}
            direction="down"
            schX={0}
            schY={-0.6}
            schStemLength={0.2}
          />
          <port
            name="pin4"
            pinNumber={4}
            aliases={["SW_A"]}
            direction="right"
            schX={0.6}
            schY={0.2}
            schStemLength={0.2}
          />
          <port
            name="pin5"
            pinNumber={5}
            aliases={["SW_B"]}
            direction="left"
            schX={-0.6}
            schY={0.2}
            schStemLength={0.2}
          />
          <schematicpath
            points={[
              { x: -0.2, y: -0.4 },
              { x: -0.2, y: -0.34 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: 0, y: -0.4 },
              { x: 0, y: -0.34 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: 0.2, y: -0.4 },
              { x: 0.2, y: -0.34 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: -0.2, y: 0.6 },
              { x: 0.2, y: 0.6 },
              { x: 0.4, y: 0.28 },
              { x: 0.4, y: -0.08 },
              { x: 0.3, y: -0.08 },
            ]}
            strokeColor="#880000"
          />
          <schematicpath
            points={[
              { x: -0.2, y: 0.6 },
              { x: -0.4, y: 0.28 },
              { x: -0.4, y: -0.08 },
              { x: -0.28, y: -0.08 },
            ]}
            strokeColor="#880000"
          />
          <schematiccircle
            center={{ x: 0, y: 0.2 }}
            radius={0.16}
            color="#880000"
          />
        </symbol>
      }
    />,
  )

  const circuitJson: AnyCircuitElement[] = circuit.getCircuitJson()
  for (const [index, text, x] of [
    [0, "C7519 · ESD ARRAY", -5.4],
    [1, "C5346074 · CRYSTAL", -1.8],
    [2, "C89334 · ANTENNA", 1.2],
    [3, "C202421 · ENCODER", 4.6],
  ] as const) {
    circuitJson.push({
      type: "schematic_text",
      schematic_text_id: `schematic_text_caption_${index}`,
      text,
      position: { x, y: -1.55 },
      font_size: 0.18,
      rotation: 0,
      anchor: "center",
      color: "#006464",
    })
  }

  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    width: 1400,
    height: 520,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
