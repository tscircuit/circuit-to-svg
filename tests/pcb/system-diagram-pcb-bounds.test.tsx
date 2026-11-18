import { expect, test } from "bun:test"
import type { SystemBlockConnection } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

// The fixture's pinned core predates the system diagram JSX elements.
const systemConnection: SystemBlockConnection = {
  type: "system_block_connection",
  system_block_connection_id: "system_block_connection_0",
  system_block_page_id: "system_block_page_0",
  from_system_block_component_id: "system_block_component_0",
  to_system_block_component_id: "system_block_component_1",
  is_signal: true,
  is_power: false,
  direction: "both",
  route: [
    { x: -300, y: -100 },
    { x: 0, y: 100 },
    { x: 300, y: 100 },
  ],
}

test("system diagram routes do not change PCB SVG bounds", async () => {
  const { circuit } = getTestFixture()
  circuit.add(
    <board
      outline={[
        { x: -21, y: -21 },
        { x: 21, y: -21 },
        { x: 21, y: 21 },
        { x: -14, y: 21 },
        { x: -21, y: 14 },
      ]}
    >
      <resistor name="R1" resistance="1k" footprint="1206" />
    </board>,
  )

  const pcb = circuit.getCircuitJson()
  const svg = convertCircuitJsonToPcbSvg([...pcb, systemConnection])

  expect(svg).toBe(convertCircuitJsonToPcbSvg(pcb))
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
