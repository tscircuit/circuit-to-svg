import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("group boundaries and their ports follow schematic sheet selection", () => {
  const json: AnyCircuitElement[] = [1, 2].flatMap(
    (index): AnyCircuitElement[] => [
      {
        type: "schematic_sheet",
        schematic_sheet_id: `sheet_${index}`,
        sheet_index: index,
        name: `Sheet ${index}`,
        sheet_width: 120,
        sheet_height: 90,
      },
      {
        type: "schematic_group",
        schematic_group_id: `group_${index}`,
        source_group_id: `source_group_${index}`,
        schematic_sheet_id: `sheet_${index}`,
        center: { x: 0, y: 0 },
        width: 6,
        height: 4,
        schematic_component_ids: [],
        show_boundary: true,
        name: `MODULE_${index}`,
      },
      {
        type: "schematic_port",
        schematic_port_id: `port_${index}`,
        source_port_id: `source_port_${index}`,
        schematic_group_id: `group_${index}`,
        schematic_sheet_id: `sheet_${index}`,
        center: { x: -3.4, y: 0 },
        boundary_position: { x: -3, y: 0 },
        facing_direction: "left",
        display_pin_label: `INPUT_${index}`,
      },
    ],
  )
  const svg = convertCircuitJsonToSchematicSvg(json, {
    schematicSheetId: "sheet_2",
  })
  expect(svg).toContain('data-schematic-group-id="group_2"')
  expect(svg).not.toContain('data-schematic-group-id="group_1"')
  expect(svg).toContain("INPUT_2")
  expect(svg).not.toContain("INPUT_1")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
