import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { Circuit } from "@tscircuit/core"

test("schematic net symbols with negated labels", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor name="R1" resistance="10k" footprint="0402" schX={0} schY={0} />
      
      {/* Test negated labels */}
      <trace schDisplayLabel="N_GND" from=".R1 > .pin1" to="net.N_GND" />
      <trace schDisplayLabel="N_VCC" from=".R1 > .pin2" to="net.N_VCC" />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const svg = convertCircuitJsonToSchematicSvg(circuitJson as any)

  // Verify that the SVG was generated successfully
  expect(svg).toBeDefined()
  expect(typeof svg).toBe("string")
  expect(svg.length).toBeGreaterThan(0)
  
  // Verify that negated labels are handled properly
  expect(svg).toContain("text-decoration: overline")
}, 20000)
