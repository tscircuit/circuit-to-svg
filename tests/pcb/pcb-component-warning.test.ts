import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const warningMessage =
  "Connector J1 faces toward the board interior; rotate it to face outward"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 30,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_j1",
    source_component_id: "source_component_j1",
    center: { x: 10, y: 0 },
    width: 8,
    height: 5,
    layer: "top",
    rotation: 0,
    obstructs_within_bounds: true,
  },
  {
    type: "pcb_connector_not_in_accessible_orientation_warning",
    pcb_connector_not_in_accessible_orientation_warning_id: "warning_j1",
    warning_type: "pcb_connector_not_in_accessible_orientation_warning",
    message: warningMessage,
    pcb_component_id: "pcb_component_j1",
    source_component_id: "source_component_j1",
    pcb_board_id: "pcb_board_0",
    facing_direction: "x-",
    recommended_facing_direction: "x+",
  },
]

test("PCB warnings are hidden by default", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svg).not.toContain(
    'data-type="pcb_connector_not_in_accessible_orientation_warning"',
  )
})

test("shouldDrawWarnings renders a connector orientation warning", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    shouldDrawWarnings: true,
  })

  expect(svg).toContain(
    'data-type="pcb_connector_not_in_accessible_orientation_warning"',
  )
  expect(svg).toContain('data-pcb-layer="overlay"')
  expect(svg).toContain(warningMessage)
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-connector-orientation-warning",
  )
})

test("shouldDrawWarnings renders a manual edit conflict warning", () => {
  const manualEditWarning: AnyCircuitElement = {
    type: "pcb_manual_edit_conflict_warning",
    pcb_manual_edit_conflict_warning_id: "warning_manual_j1",
    warning_type: "pcb_manual_edit_conflict_warning",
    message: "J1 has both a manual placement and explicit PCB coordinates",
    pcb_component_id: "pcb_component_j1",
    source_component_id: "source_component_j1",
  }
  const svg = convertCircuitJsonToPcbSvg([...circuitJson, manualEditWarning], {
    shouldDrawWarnings: true,
  })

  expect(svg).toContain('data-type="pcb_manual_edit_conflict_warning"')
  expect(svg).toContain(manualEditWarning.message)
})
