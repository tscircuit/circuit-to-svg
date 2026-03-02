import { test, expect } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb_component_outside_board_error shown in pcb snapshot", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm">
      <pinheader name="P1" pinCount={4} pcbX={8} />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson() as any[]

  circuitJson.push({
    type: "pcb_component_outside_board_error",
    pcb_component_outside_board_error_id:
      "pcb_component_outside_board_pcb_component_0",
    error_type: "pcb_component_outside_board_error",
    message: "Component P1 extends outside board boundaries",
    pcb_component_id: "pcb_component_0",
    pcb_board_id: "pcb_board_0",
    component_center: {
      x: 8,
      y: 0,
    },
    component_bounds: {
      min_x: 6,
      max_x: 12,
      min_y: -2,
      max_y: 2,
    },
  })

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    shouldDrawErrors: true,
  })

  expect(svg).toContain('data-type="pcb_component_outside_board_error"')
  expect(svg).toContain("Component P1 extends outside board boundaries")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
