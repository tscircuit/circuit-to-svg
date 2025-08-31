import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { Circuit } from "@tscircuit/core"

test("schematic net symbols with different anchor sides", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="30mm" height="30mm">
      {/* Test symbols with different anchor sides */}
      <resistor name="R1" resistance="10k" footprint="0402" schX={-5} schY={0} />
      <resistor name="R2" resistance="10k" footprint="0402" schX={5} schY={0} />
      <resistor name="R3" resistance="10k" footprint="0402" schX={0} schY={-5} />
      <resistor name="R4" resistance="10k" footprint="0402" schX={0} schY={5} />
      
      {/* Test different anchor sides */}
      <trace schDisplayLabel="GND_LEFT" from=".R1 > .pin1" to="net.GND" />
      <trace schDisplayLabel="VCC_RIGHT" from=".R2 > .pin1" to="net.VCC" />
      <trace schDisplayLabel="BAT_TOP" from=".R3 > .pin1" to="net.BAT" />
      <trace schDisplayLabel="CAP_BOTTOM" from=".R4 > .pin1" to="net.CAP" />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const svg = convertCircuitJsonToSchematicSvg(circuitJson as any)

  // Verify that the SVG was generated successfully
  expect(svg).toBeDefined()
  expect(typeof svg).toBe("string")
  expect(svg.length).toBeGreaterThan(0)
  
  // Verify that all symbol types are present
  expect(svg).toContain("ground")
  expect(svg).toContain("vcc")
  expect(svg).toContain("battery")
  expect(svg).toContain("capacitor")
}, 20000)
