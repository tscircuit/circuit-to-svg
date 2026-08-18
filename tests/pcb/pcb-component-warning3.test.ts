import { expect, test } from "bun:test"
import type { PcbManualEditConflictWarning } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import {
  usbCFlashlightCircuitJson,
  usbCPcbComponent,
} from "./pcb-component-warning.fixture"

test("shouldDrawWarnings renders a manual edit conflict warning", () => {
  const manualEditWarning: PcbManualEditConflictWarning = {
    type: "pcb_manual_edit_conflict_warning",
    pcb_manual_edit_conflict_warning_id: "warning_manual_usbc",
    warning_type: "pcb_manual_edit_conflict_warning",
    message: "USBC has both a manual placement and explicit PCB coordinates",
    pcb_component_id: usbCPcbComponent.pcb_component_id,
    source_component_id: usbCPcbComponent.source_component_id,
  }
  const svg = convertCircuitJsonToPcbSvg(
    [...usbCFlashlightCircuitJson, manualEditWarning],
    { shouldDrawWarnings: true },
  )

  expect(svg).toContain('data-type="pcb_manual_edit_conflict_warning"')
  expect(svg).toContain(manualEditWarning.message)
})
