import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import {
  circuitJsonWithConnectorWarning,
  connectorWarningMessage,
} from "./pcb-component-warning.fixture"

test("shouldDrawWarnings renders a real USB-C orientation warning", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJsonWithConnectorWarning, {
    shouldDrawWarnings: true,
  })

  expect(svg).toContain(
    'data-type="pcb_connector_not_in_accessible_orientation_warning"',
  )
  expect(svg).toContain('data-pcb-layer="overlay"')
  expect(svg).toContain(connectorWarningMessage)
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-connector-orientation-warning",
  )
})
