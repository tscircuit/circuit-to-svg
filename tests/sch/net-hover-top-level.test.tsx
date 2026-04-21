import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

// Top-level circuits don't get subcircuit_connectivity_map_key from the router,
// so hover CSS was never generated for them. This test verifies that the
// fallback net grouping produces valid hover rules in the SVG output.
test("net hover styles generated for top-level circuit traces", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor name="R1" resistance="10k" footprint="0402" schX={-2} />
      <resistor name="R2" resistance="10k" footprint="0402" schX={2} />
      <trace from=".R1 > .pin2" to=".R2 > .pin1" />
    </board>,
  )

  const svg = convertCircuitJsonToSchematicSvg(
    circuit.getCircuitJson() as AnyCircuitElement[],
  )

  // The SVG must contain hover CSS that targets a net group key
  expect(svg).toContain("data-subcircuit-connectivity-map-key")
  // The net-group hover rule should reference the invert filter
  expect(svg).toContain("filter: invert(1)")
})

test("traces in the same net share a connectivity key", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor name="R1" resistance="10k" footprint="0402" schX={-3} />
      <resistor name="R2" resistance="10k" footprint="0402" schX={0} />
      <resistor name="R3" resistance="10k" footprint="0402" schX={3} />
      <trace from=".R1 > .pin2" to=".R2 > .pin1" />
      <trace from=".R2 > .pin2" to=".R3 > .pin1" />
      <trace from=".R1 > .pin1" to=".R3 > .pin2" />
    </board>,
  )

  const svg = convertCircuitJsonToSchematicSvg(
    circuit.getCircuitJson() as AnyCircuitElement[],
  )

  // Every schematic_trace group must carry a connectivity key attribute
  const keyMatches = svg.match(/data-subcircuit-connectivity-map-key="[^"]+"/g)
  expect(keyMatches).not.toBeNull()
  // Each trace group produces 2 elements (base + overlay), so at least 2
  expect(keyMatches!.length).toBeGreaterThanOrEqual(2)
})
