import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("real net labels participate in net-hover highlighting", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor name="R1" resistance="10k" footprint="0402" schX={-4} />
      <chip name="U1" footprint="soic16" schX={0} schY={0} />
      <capacitor name="C1" capacitance="0.1uF" footprint="0402" schX={4} />
      <trace from=".R1 > .pin2" to=".C1 > .pin1" />
    </board>,
  )

  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()
  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  // This connection is rendered as a net label at each endpoint (no drawn wire
  // between them). Each real net label is wrapped in a hoverable group tagged
  // with its net's connectivity key, so hovering one highlights the whole net.
  const labelKeys = [
    ...svg.matchAll(
      /<g class="net-label sch-net-label"[^>]*data-subcircuit-connectivity-map-key="([^"]+)"/g,
    ),
  ].map((m) => m[1]!)

  // Both endpoints of the same net share a single connectivity key.
  expect(labelKeys.length).toBeGreaterThanOrEqual(2)
  const netLabelKey = labelKeys[0]!
  expect(netLabelKey).toBeTruthy()
  expect(labelKeys.every((key) => key === netLabelKey)).toBe(true)

  // The generated hover CSS wires the net label groups into the net-hover rule
  // (alongside any traces sharing the same key).
  expect(svg).toContain(
    `g.sch-net-label[data-subcircuit-connectivity-map-key="${netLabelKey}"]`,
  )
  // And the per-label hover fallback exists.
  expect(svg).toContain("g.sch-net-label:hover")
})

test("net labels highlight together with the net's traces", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor name="R1" resistance="10k" footprint="0402" schX={-3} />
      <capacitor name="C1" capacitance="0.1uF" footprint="0402" schX={3} />
      <trace from=".R1 > .pin2" to=".C1 > .pin1" />
      <trace from=".R1 > .pin2" to="net.MYNET" />
    </board>,
  )

  await circuit.renderUntilSettled()

  const svg = convertCircuitJsonToSchematicSvg(circuit.getCircuitJson())

  // The named net produces both a drawn trace and a real net label. They must
  // carry the same connectivity key so hovering either highlights both.
  const netLabelKey = svg.match(
    /<g class="net-label sch-net-label"[^>]*data-subcircuit-connectivity-map-key="([^"]+)"/,
  )?.[1]
  expect(netLabelKey).toBeTruthy()

  const traceKeys = [
    ...svg.matchAll(
      /<g class="trace sch-trace"[^>]*data-subcircuit-connectivity-map-key="([^"]+)"/g,
    ),
  ].map((m) => m[1])
  expect(traceKeys).toContain(netLabelKey)
})

test("power/ground symbol net labels do NOT get a hover group", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor name="R1" resistance="10k" footprint="0402" schX={0} />
      <trace from=".R1 > .pin1" to="net.GND" />
    </board>,
  )

  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()

  // Sanity check: this circuit produces a symbol-based (ground) net label.
  const symbolLabel = (circuitJson as any[]).find(
    (e) => e.type === "schematic_net_label" && e.symbol_name,
  )
  expect(symbolLabel).toBeDefined()

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  // Symbol net labels are rendered by the symbol renderer and must not be
  // wrapped in the net-label hover group.
  expect(svg).not.toContain('<g class="net-label sch-net-label"')
})
