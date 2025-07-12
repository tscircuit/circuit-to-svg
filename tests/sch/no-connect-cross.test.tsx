import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("schematic no-connect cross", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_component",
      size: { width: 1, height: 1 },
      center: { x: 0, y: 0 },
      source_component_id: "source_component_0",
      schematic_component_id: "schematic_component_0",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_0",
      source_port_id: "source_port_0",
      schematic_component_id: "schematic_component_0",
      center: { x: 0.7, y: 0 },
      side_of_component: "right",
      distance_from_component_edge: 0.5,
      is_connected: false,
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    grid: { cellSize: 1, labelCells: true },
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
