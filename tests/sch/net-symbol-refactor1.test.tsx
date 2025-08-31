import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { Circuit } from "@tscircuit/core"

test("schematic net symbols with different symbol types", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="40mm" height="30mm">
      {/* Test ground symbol */}
      <resistor name="R1" resistance="10k" footprint="0402" schX={-10} schY={-5} />
      <trace schDisplayLabel="GND" from=".R1 > .pin1" to="net.GND" />
      
      {/* Test VCC symbol */}
      <resistor name="R2" resistance="10k" footprint="0402" schX={10} schY={-5} />
      <trace schDisplayLabel="VCC" from=".R2 > .pin1" to="net.VCC" />
      
      {/* Test battery symbol */}
      <resistor name="R3" resistance="10k" footprint="0402" schX={-10} schY={5} />
      <trace schDisplayLabel="BAT" from=".R3 > .pin1" to="net.BAT" />
      
      {/* Test capacitor symbol */}
      <resistor name="R4" resistance="10k" footprint="0402" schX={10} schY={5} />
      <trace schDisplayLabel="CAP" from=".R4 > .pin1" to="net.CAP" />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const svg = convertCircuitJsonToSchematicSvg(circuitJson as any)

  // Verify that the SVG was generated successfully
  expect(svg).toBeDefined()
  expect(typeof svg).toBe("string")
  expect(svg.length).toBeGreaterThan(0)
  
  // Verify that different symbol types are rendered
  expect(svg).toContain("ground") // Ground symbol should be present
  expect(svg).toContain("vcc") // VCC symbol should be present
  
  // Verify that the SVG contains proper path elements for symbols
  expect(svg).toContain("<path") // Should contain path elements for symbol rendering
  
  // Verify that text elements are present for labels
  expect(svg).toContain("<text") // Should contain text elements for labels
}, 20000)
