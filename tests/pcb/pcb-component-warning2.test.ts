import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import {
  circuitJsonWithConnectorWarning,
  connectorWarningMessage,
  usbCPcbComponent,
} from "./pcb-component-warning.fixture"

test("shouldDrawWarnings highlights a backwards real USB-C connector", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJsonWithConnectorWarning, {
    shouldDrawWarnings: true,
  })

  expect(svg).toContain(
    'data-type="pcb_connector_not_in_accessible_orientation_warning"',
  )
  expect(svg).toContain('data-pcb-layer="overlay"')
  expect(svg).toContain(connectorWarningMessage)
  expect(usbCPcbComponent.rotation).toBe(180)
  expect(usbCPcbComponent.cable_insertion_center?.y).toBeGreaterThan(
    usbCPcbComponent.center.y,
  )
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-connector-orientation-warning",
  )
})
