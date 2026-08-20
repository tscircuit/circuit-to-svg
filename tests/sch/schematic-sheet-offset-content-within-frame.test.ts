import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "lib/index"
import {
  type SchematicSheetWithCenter,
  getSchematicSheetLayout,
} from "lib/sch/schematic-sheet-utils"

const OFFSET_SHEET_CENTER_X = -15.75
const RESISTOR_WIDTH = 1.18

test("sheet center keeps offset content inside its frame", () => {
  const offsetSheet: SchematicSheetWithCenter = {
    type: "schematic_sheet",
    schematic_sheet_id: "schematic_sheet_2",
    sheet_index: 1,
    center: { x: OFFSET_SHEET_CENTER_X, y: 0 },
  }
  const layout = getSchematicSheetLayout(offsetSheet)
  const resistorMinX = OFFSET_SHEET_CENTER_X - RESISTOR_WIDTH / 2
  const resistorMaxX = OFFSET_SHEET_CENTER_X + RESISTOR_WIDTH / 2

  expect(layout.center).toEqual({ x: OFFSET_SHEET_CENTER_X, y: 0 })
  expect(layout.innerMinX).toBeLessThan(resistorMinX)
  expect(layout.innerMaxX).toBeGreaterThan(resistorMaxX)

  const svg = convertCircuitJsonToStackedSchematicSheetsSvg(
    createMultiSheetCircuitJson(),
    { width: 600, height: 424 },
  )
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

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
      center: { x: OFFSET_SHEET_CENTER_X, y: 0 },
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
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_r2",
      source_component_id: "source_component_r2",
      center: { x: OFFSET_SHEET_CENTER_X, y: 0 },
      is_box_with_pins: true,
      size: { width: RESISTOR_WIDTH, height: 1.3 },
      symbol_name: "boxresistor_right",
      schematic_sheet_id: "schematic_sheet_2",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r2_1",
      source_port_id: "source_port_r2_1",
      center: { x: OFFSET_SHEET_CENTER_X - 0.5, y: 0 },
      facing_direction: "left",
      schematic_component_id: "schematic_component_r2",
      schematic_sheet_id: "schematic_sheet_2",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r2_2",
      source_port_id: "source_port_r2_2",
      center: { x: OFFSET_SHEET_CENTER_X + 0.5, y: 0 },
      facing_direction: "right",
      schematic_component_id: "schematic_component_r2",
      schematic_sheet_id: "schematic_sheet_2",
    },
  ]
}
