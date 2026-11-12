import { expect, test } from "bun:test"
import type { AnyCircuitElement, SchematicPort } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getSchematicBoundsFromCircuitJson } from "lib/sch/get-schematic-bounds-from-circuit-json"

test("expanded group has a frame and persistent public terminals on all four sides", () => {
  const ports: SchematicPort[] = [
    {
      type: "schematic_port",
      schematic_port_id: "left",
      source_port_id: "public_in",
      schematic_group_id: "group",
      center: { x: 4.6, y: -3 },
      boundary_position: { x: 5, y: -3 },
      facing_direction: "left",
      display_pin_label: "LONG_EXPORTED_INPUT_NAME",
      is_connected: true,
    },
    {
      type: "schematic_port",
      schematic_port_id: "right",
      source_port_id: "public_out",
      schematic_group_id: "group",
      center: { x: 11.4, y: -3 },
      boundary_position: { x: 11, y: -3 },
      facing_direction: "right",
      display_pin_label: "OUTPUT",
      is_connected: false,
    },
    {
      type: "schematic_port",
      schematic_port_id: "top",
      source_port_id: "public_power",
      schematic_group_id: "group",
      center: { x: 8, y: -0.6 },
      boundary_position: { x: 8, y: -1 },
      facing_direction: "up",
      display_pin_label: "VCC",
    },
    {
      type: "schematic_port",
      schematic_port_id: "bottom",
      source_port_id: "public_ground",
      schematic_group_id: "group",
      center: { x: 8, y: -5.4 },
      boundary_position: { x: 8, y: -5 },
      facing_direction: "down",
      display_pin_label: "GND",
    },
  ]
  const json: AnyCircuitElement[] = [
    {
      type: "schematic_group",
      schematic_group_id: "group",
      source_group_id: "source_group",
      center: { x: 8, y: -3 },
      width: 6,
      height: 4,
      schematic_component_ids: [],
      show_boundary: true,
      name: "EXPORTED INTERFACE",
    },
    ...ports,
  ]
  const svg = convertCircuitJsonToSchematicSvg(json)
  expect(svg.match(/class="sch-group-boundary"/g)).toHaveLength(1)
  expect(svg.match(/class="sch-group-port-terminal"/g)).toHaveLength(4)
  expect(svg).toContain('data-source-port-id="public_in"')
  const bounds = getSchematicBoundsFromCircuitJson(json, 0)
  expect(bounds.minX).toBeLessThan(1)
  expect(bounds.maxX).toBeGreaterThan(12)
  expect(bounds.maxY).toBeGreaterThan(-0.6)
  expect(bounds.minY).toBeLessThan(-5.4)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
