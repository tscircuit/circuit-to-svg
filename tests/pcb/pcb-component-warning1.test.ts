import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { circuitJsonWithConnectorWarning } from "./pcb-component-warning.fixture"

test("PCB warnings are hidden by default", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJsonWithConnectorWarning)

  expect(svg).not.toContain(
    'data-type="pcb_connector_not_in_accessible_orientation_warning"',
  )
})
