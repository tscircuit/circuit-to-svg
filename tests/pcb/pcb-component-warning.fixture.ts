import type {
  AnyCircuitElement,
  PcbBoard,
  PcbComponent,
  PcbConnectorNotInAccessibleOrientationWarning,
} from "circuit-json"
import usbCFlashlightJson from "./assets/usb-c-flashlight-core-issue-680.json"

// Real Circuit JSON for the USB-C Flashlight reported in
// https://github.com/tscircuit/core/issues/680
// Source: https://github.com/tscircuit/circuitjson.com/blob/e430382a99f62704940d14af2e44122a39842514/assets/usb-c-flashlight.json
export const usbCFlashlightCircuitJson =
  usbCFlashlightJson as AnyCircuitElement[]

interface LegacySourceComponent {
  type: "source_component"
  source_component_id: string
  name: string
}

const usbCSourceComponent = (
  usbCFlashlightCircuitJson as Array<AnyCircuitElement | LegacySourceComponent>
).find(
  (element): element is LegacySourceComponent =>
    element.type === "source_component" && element.name === "USBC",
)

if (!usbCSourceComponent) {
  throw new Error(
    "USB-C Flashlight fixture is missing its USBC source component",
  )
}

const foundUsbCPcbComponent = usbCFlashlightCircuitJson.find(
  (element): element is PcbComponent =>
    element.type === "pcb_component" &&
    element.source_component_id === usbCSourceComponent.source_component_id,
)

const pcbBoard = usbCFlashlightCircuitJson.find(
  (element): element is PcbBoard => element.type === "pcb_board",
)

if (!foundUsbCPcbComponent || !pcbBoard) {
  throw new Error("USB-C Flashlight fixture is missing PCB geometry")
}

export const usbCPcbComponent = foundUsbCPcbComponent

export const connectorWarningMessage =
  "USBC is facing y+ but should face y- so the connector is accessible from the board edge"

export const connectorOrientationWarning: PcbConnectorNotInAccessibleOrientationWarning =
  {
    type: "pcb_connector_not_in_accessible_orientation_warning",
    pcb_connector_not_in_accessible_orientation_warning_id:
      "pcb_connector_not_in_accessible_orientation_warning_pcb_component_0",
    warning_type: "pcb_connector_not_in_accessible_orientation_warning",
    message: connectorWarningMessage,
    pcb_component_id: usbCPcbComponent.pcb_component_id,
    source_component_id: usbCSourceComponent.source_component_id,
    pcb_board_id: pcbBoard.pcb_board_id,
    facing_direction: "y+",
    recommended_facing_direction: "y-",
  }

export const circuitJsonWithConnectorWarning: AnyCircuitElement[] = [
  ...usbCFlashlightCircuitJson,
  connectorOrientationWarning,
]
