import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("all components with display_name", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="30mm" height="20mm" routingDisabled>
      <resistor name="R1" resistance="1k" schX={-8} schY={5} />
      <capacitor name="C1" capacitance="1uF" schX={-5} schY={5} />
      <inductor name="L1" inductance="1uH" schX={-2} schY={5} />
      <diode name="D1" schX={1} schY={5} />
      <led name="LED1" schX={4} schY={5} />

      <transistor name="Q1" type="npn" schX={-8} schY={0} />
      <transistor name="Q2" type="pnp" schX={-5} schY={0} />
      <transistor name="M1" type="mosfet" schX={-2} schY={0} />
      <transistor name="M2" type="mosfet" schX={1} schY={0} />

      <switch name="SW1" type="spst" schX={-8} schY={-5} />
      <switch name="SW2" type="spdt" schX={-5} schY={-5} />
      <pushbutton name="PB1" schX={-2} schY={-5} />

      <chip name="U1" footprint="soic8" schX={4} schY={-5} />
      <bug name="U2" footprint="soic8" schX={7} schY={-5} />

      <crystal
        name="Y1"
        frequency="16MHz"
        loadCapacitance="20pF"
        schX={7}
        schY={0}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson() as any[]

  // Inject display_name for all components
  circuitJson.forEach((elm) => {
    if (elm.type === "source_component") {
      elm.display_name = `Disp: ${elm.name}`
      console.log("Found source component:", elm.name, elm.ftype)
    }
  })

  // console.log(JSON.stringify(circuitJson, null, 2))

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  // Verify basic presence
  expect(svg).toContain("Disp: R1")
  expect(svg).toContain("Disp: C1")
  expect(svg).toContain("Disp: L1")
  expect(svg).toContain("Disp: D1")
  expect(svg).toContain("Disp: LED1")
  expect(svg).toContain("Disp: Q1")
  expect(svg).toContain("Disp: Q2")
  expect(svg).toContain("Disp: M1")
  expect(svg).toContain("Disp: M2")
  expect(svg).toContain("Disp: SW1")
  expect(svg).toContain("Disp: SW2")
  expect(svg).toContain("Disp: PB1")
  expect(svg).toContain("Disp: U1")
  expect(svg).toContain("Disp: U2")
  expect(svg).toContain("Disp: Y1")

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
