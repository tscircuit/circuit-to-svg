import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("warning bounds account for PCB component rotation", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_j1",
      source_component_id: "source_component_j1",
      center: { x: 0, y: 0 },
      width: 8,
      height: 4,
      layer: "top",
      rotation: 90,
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_connector_not_in_accessible_orientation_warning",
      pcb_connector_not_in_accessible_orientation_warning_id: "warning_j1",
      warning_type: "pcb_connector_not_in_accessible_orientation_warning",
      message: "J1 should face outward",
      pcb_component_id: "pcb_component_j1",
      source_component_id: "source_component_j1",
      pcb_board_id: "pcb_board_0",
      facing_direction: "x-",
      recommended_facing_direction: "y+",
    },
  ]
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    shouldDrawWarnings: true,
  })
  const warningRect = svg.match(
    /<rect x="[^"]+" y="[^"]+" width="([^"]+)" height="([^"]+)"[^>]+data-type="pcb_connector_not_in_accessible_orientation_warning"/,
  )

  expect(warningRect).not.toBeNull()
  expect(Number(warningRect?.[1])).toBeLessThan(Number(warningRect?.[2]))
})
