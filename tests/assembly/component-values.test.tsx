import { expect, test } from "bun:test"
import { convertCircuitJsonToAssemblySvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("assembly component labels include passive values", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="30mm" height="10mm">
      <resistor name="R1" resistance="4.7k" footprint="0805" pcbX={-9} />
      <capacitor name="C1" capacitance="0.1uF" footprint="0805" pcbX={0} />
      <inductor name="L1" inductance="2.2uH" footprint="0805" pcbX={9} />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()
  const assemblySvg = convertCircuitJsonToAssemblySvg(circuitJson as any)

  expect(assemblySvg).toContain(">4.7kΩ<")
  expect(assemblySvg).toContain(">0.1uF<")
  expect(assemblySvg).toContain(">2.2µH<")
  expect(assemblySvg).toMatchSvgSnapshot(import.meta.path)

  for (const component of circuitJson) {
    if (component.type !== "source_component") continue
    if (component.ftype === "simple_resistor") {
      component.display_resistance = undefined
    } else if (component.ftype === "simple_capacitor") {
      component.display_capacitance = undefined
    } else if (component.ftype === "simple_inductor") {
      component.display_inductance = undefined
      component.inductance = 2.2e-6
    }
  }

  const fallbackValueSvg = convertCircuitJsonToAssemblySvg(circuitJson as any)
  expect(fallbackValueSvg).toContain(">4.7kΩ<")
  expect(fallbackValueSvg).toContain(">100nF<")
  expect(fallbackValueSvg).toContain(">2.2µH<")
})
