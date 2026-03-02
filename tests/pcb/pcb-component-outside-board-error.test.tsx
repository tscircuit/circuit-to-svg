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
    // Intentionally only outside-board sliver; renderer should prefer pcb_component bounds
    // so the rectangle encloses the whole component (including inside-board area).
    component_bounds: {
      min_x: 10.5,
      max_x: 12,
      min_y: -1,
      max_y: 1,
    },
  })

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    shouldDrawErrors: true,
  })

  expect(svg).toContain('data-type="pcb_component_outside_board_error"')
  expect(svg).toContain("Component P1 extends outside board boundaries")
  const errorRectMatch = svg.match(
    /<rect(?=[^>]*data-type="pcb_component_outside_board_error")(?=[^>]*\swidth="([0-9.]+)")[^>]*>/,
  )
  expect(errorRectMatch).not.toBeNull()
  const errorRectWidth = Number(errorRectMatch?.[1])
  expect(errorRectWidth).toBeGreaterThan(100)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
