import type {
  AnyCircuitElement,
  PcbBoard,
  PcbComponent,
  PcbConnectorNotInAccessibleOrientationWarning,
  Point,
  SourcePort,
  SourceTrace,
} from "circuit-json"
import usbCFlashlightJson from "./assets/usb-c-flashlight-core-issue-680.json"

// Real Circuit JSON for the USB-C Flashlight reported in
// https://github.com/tscircuit/core/issues/680
// Source: https://github.com/tscircuit/circuitjson.com/blob/e430382a99f62704940d14af2e44122a39842514/assets/usb-c-flashlight.json
const usbCFlashlightIssueCircuitJson = usbCFlashlightJson as AnyCircuitElement[]

interface LegacySourceComponent {
  type: "source_component"
  source_component_id: string
  name: string
}

const usbCSourceComponent = (
  usbCFlashlightIssueCircuitJson as Array<
    AnyCircuitElement | LegacySourceComponent
  >
).find(
  (element): element is LegacySourceComponent =>
    element.type === "source_component" && element.name === "USBC",
)

if (!usbCSourceComponent) {
  throw new Error(
    "USB-C Flashlight fixture is missing its USBC source component",
  )
}

const issueUsbCPcbComponent = usbCFlashlightIssueCircuitJson.find(
  (element): element is PcbComponent =>
    element.type === "pcb_component" &&
    element.source_component_id === usbCSourceComponent.source_component_id,
)

const pcbBoard = usbCFlashlightIssueCircuitJson.find(
  (element): element is PcbBoard => element.type === "pcb_board",
)

if (!issueUsbCPcbComponent || !pcbBoard) {
  throw new Error("USB-C Flashlight fixture is missing PCB geometry")
}

const usbCSourcePortIds = new Set(
  usbCFlashlightIssueCircuitJson
    .filter(
      (element): element is SourcePort =>
        element.type === "source_port" &&
        element.source_component_id === usbCSourceComponent.source_component_id,
    )
    .map((element) => element.source_port_id),
)

const usbCSourceTraceIds = new Set(
  usbCFlashlightIssueCircuitJson
    .filter(
      (element): element is SourceTrace =>
        element.type === "source_trace" &&
        element.connected_source_port_ids.some((sourcePortId) =>
          usbCSourcePortIds.has(sourcePortId),
        ),
    )
    .map((element) => element.source_trace_id),
)

function rotatePoint180(point: Point, center: Point): Point {
  return {
    x: 2 * center.x - point.x,
    y: 2 * center.y - point.y,
  }
}

function hasXY(
  element: AnyCircuitElement,
): element is AnyCircuitElement & Point {
  return (
    "x" in element &&
    "y" in element &&
    typeof element.x === "number" &&
    typeof element.y === "number"
  )
}

/**
 * Derive a true backwards-connector repro from the issue data. The original
 * board has its USB-C receptacle facing the bottom edge; rotate the component
 * and its physical footprint 180 degrees so its opening faces the board
 * interior. Connector-owned traces are omitted rather than left attached to
 * the original pad positions.
 */
export const usbCFlashlightCircuitJson = structuredClone(
  usbCFlashlightIssueCircuitJson,
).filter(
  (element) =>
    element.type !== "pcb_trace" ||
    !element.source_trace_id ||
    !usbCSourceTraceIds.has(element.source_trace_id),
)

const connectorSilkscreenMaxY =
  issueUsbCPcbComponent.center.y + issueUsbCPcbComponent.height / 2 + 1

for (const element of usbCFlashlightCircuitJson) {
  if (
    element.type === "pcb_component" &&
    element.pcb_component_id === issueUsbCPcbComponent.pcb_component_id
  ) {
    element.rotation = (element.rotation + 180) % 360
    element.cable_insertion_center = {
      x: element.center.x,
      y: element.center.y + element.height / 2,
    }
    continue
  }

  if (
    element.type === "cad_component" &&
    element.pcb_component_id === issueUsbCPcbComponent.pcb_component_id
  ) {
    const rotatedPosition = rotatePoint180(
      element.position,
      issueUsbCPcbComponent.center,
    )
    element.position.x = rotatedPosition.x
    element.position.y = rotatedPosition.y
    element.rotation = {
      x: element.rotation?.x ?? 0,
      y: element.rotation?.y ?? 0,
      z: ((element.rotation?.z ?? 0) + 180) % 360,
    }
    continue
  }

  const belongsToUsbC =
    "pcb_component_id" in element &&
    element.pcb_component_id === issueUsbCPcbComponent.pcb_component_id

  if (belongsToUsbC && hasXY(element)) {
    const rotatedPosition = rotatePoint180(
      element,
      issueUsbCPcbComponent.center,
    )
    element.x = rotatedPosition.x
    element.y = rotatedPosition.y
    continue
  }

  if (element.type === "pcb_hole" && element.y < connectorSilkscreenMaxY) {
    const rotatedPosition = rotatePoint180(
      element,
      issueUsbCPcbComponent.center,
    )
    element.x = rotatedPosition.x
    element.y = rotatedPosition.y
    continue
  }

  if (
    element.type === "pcb_silkscreen_path" &&
    element.route.every((point) => point.y < connectorSilkscreenMaxY)
  ) {
    element.route = element.route.map((point) => ({
      ...point,
      ...rotatePoint180(point, issueUsbCPcbComponent.center),
    }))
  }
}

const foundBackwardsUsbCPcbComponent = usbCFlashlightCircuitJson.find(
  (element): element is PcbComponent =>
    element.type === "pcb_component" &&
    element.pcb_component_id === issueUsbCPcbComponent.pcb_component_id,
)

if (!foundBackwardsUsbCPcbComponent) {
  throw new Error("Backwards USB-C fixture is missing its PCB component")
}

export const usbCPcbComponent = foundBackwardsUsbCPcbComponent

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
