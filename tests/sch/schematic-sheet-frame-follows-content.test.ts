import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "lib/index"
import { getSchematicSheetLayout } from "lib/sch/schematic-sheet-utils"

/**
 * The sheet frame is centered at the origin for every sheet (it is not tiled by
 * sheet_index), so it lines up with the sheet's components - which core lays out
 * independently around the origin. In the stacked snapshot both sheets' single
 * component sits centered in its own frame.
 */
test("sheet frame follows content (centered at the origin) regardless of sheet_index", () => {
  // The frame is centered at the origin, so content laid out around the origin
  // lines up with its frame.
  const layout = getSchematicSheetLayout()
  expect(layout.center.x).toBe(0)
  expect(layout.center.y).toBe(0)

  const svg = convertCircuitJsonToStackedSchematicSheetsSvg(
    createMultiSheetCircuitJson(),
    { width: 600, height: 424 },
  )
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

/**
 * Two sheets, each with a single component at the origin - mirroring how core
 * lays out each sheet independently around the origin.
 */
function createMultiSheetCircuitJson(): AnyCircuitElement[] {
  return [
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_1",
      name: "Sheet 1",
      display_name: "Sheet 1",
      sheet_index: 0,
    } as AnyCircuitElement,
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_2",
      name: "Sheet 2",
      display_name: "Sheet 2",
      sheet_index: 1,
    } as AnyCircuitElement,
    {
      type: "source_component",
      source_component_id: "source_component_r1",
      name: "R1",
      ftype: "simple_resistor",
      resistance: 10,
    },
    {
      type: "source_component",
      source_component_id: "source_component_r2",
      name: "R2",
      ftype: "simple_resistor",
      resistance: 20,
    },
    {
      type: "source_port",
      source_port_id: "source_port_r1_1",
      name: "left",
      source_component_id: "source_component_r1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_r1_2",
      name: "right",
      source_component_id: "source_component_r1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_r2_1",
      name: "left",
      source_component_id: "source_component_r2",
    },
    {
      type: "source_port",
      source_port_id: "source_port_r2_2",
      name: "right",
      source_component_id: "source_component_r2",
    },
    // Sheet 1 component at the origin.
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_r1",
      source_component_id: "source_component_r1",
      center: { x: 0, y: 0 },
      is_box_with_pins: true,
      size: { width: 1.18, height: 1.3 },
      symbol_name: "boxresistor_right",
      schematic_sheet_id: "schematic_sheet_1",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r1_1",
      source_port_id: "source_port_r1_1",
      center: { x: -0.5, y: 0 },
      facing_direction: "left",
      schematic_component_id: "schematic_component_r1",
      schematic_sheet_id: "schematic_sheet_1",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r1_2",
      source_port_id: "source_port_r1_2",
      center: { x: 0.5, y: 0 },
      facing_direction: "right",
      schematic_component_id: "schematic_component_r1",
      schematic_sheet_id: "schematic_sheet_1",
    },
    // Sheet 2 component ALSO at the origin (core lays out each sheet around the
    // origin regardless of sheet_index).
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_r2",
      source_component_id: "source_component_r2",
      center: { x: 0, y: 0 },
      is_box_with_pins: true,
      size: { width: 1.18, height: 1.3 },
      symbol_name: "boxresistor_right",
      schematic_sheet_id: "schematic_sheet_2",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r2_1",
      source_port_id: "source_port_r2_1",
      center: { x: -0.5, y: 0 },
      facing_direction: "left",
      schematic_component_id: "schematic_component_r2",
      schematic_sheet_id: "schematic_sheet_2",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r2_2",
      source_port_id: "source_port_r2_2",
      center: { x: 0.5, y: 0 },
      facing_direction: "right",
      schematic_component_id: "schematic_component_r2",
      schematic_sheet_id: "schematic_sheet_2",
    },
  ]
}
