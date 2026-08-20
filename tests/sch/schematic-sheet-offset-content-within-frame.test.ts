import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "lib/index"
import { getSchematicSheetLayout } from "lib/sch/schematic-sheet-utils"

/**
 * The sheet frame is centered at the origin, but a sheet's content does not have
 * to be perfectly centered. Here Sheet 2's resistor sits at x = -5 (off-center).
 * Because the A4 frame spans roughly x ∈ [-16, 16] around the origin, the
 * component is still comfortably inside its frame - just shifted left of center.
 *
 * In the stacked snapshot Sheet 1's resistor is centered while Sheet 2's resistor
 * is left-of-center but still within the frame.
 */
test("off-center sheet content still renders inside the origin-centered frame", () => {
  const layout = getSchematicSheetLayout()
  // A resistor at x = -5 is within the frame's horizontal extent.
  expect(layout.minX).toBeLessThan(-5)
  expect(layout.maxX).toBeGreaterThan(-5)

  const svg = convertCircuitJsonToStackedSchematicSheetsSvg(
    createMultiSheetCircuitJson(),
    { width: 600, height: 424 },
  )
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

/**
 * Two sheets: Sheet 1's resistor at the origin, Sheet 2's resistor offset to
 * x = -5 (but still within its frame).
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
    // Sheet 1 resistor at the origin.
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
    // Sheet 2 resistor offset to x = -5 (off-center but inside the frame).
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_r2",
      source_component_id: "source_component_r2",
      center: { x: -5, y: 0 },
      is_box_with_pins: true,
      size: { width: 1.18, height: 1.3 },
      symbol_name: "boxresistor_right",
      schematic_sheet_id: "schematic_sheet_2",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r2_1",
      source_port_id: "source_port_r2_1",
      center: { x: -5.5, y: 0 },
      facing_direction: "left",
      schematic_component_id: "schematic_component_r2",
      schematic_sheet_id: "schematic_sheet_2",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r2_2",
      source_port_id: "source_port_r2_2",
      center: { x: -4.5, y: 0 },
      facing_direction: "right",
      schematic_component_id: "schematic_component_r2",
      schematic_sheet_id: "schematic_sheet_2",
    },
  ]
}
