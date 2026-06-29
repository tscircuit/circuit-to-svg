import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "lib/index"

test("stacked schematic svg renders every sheet stacked vertically", () => {
  // width:height matches the A4 sheet aspect ratio (297:210) so each panel
  // fills the width without letterboxing.
  const svg = convertCircuitJsonToStackedSchematicSheetsSvg(
    createMultiSheetCircuitJson(),
    { width: 600, height: 424 },
  )

  // Both sheets (and both of their components) are present in a single SVG.
  expect(svg).toContain('class="tscircuit-stacked-schematic"')
  expect(svg).toContain('data-schematic-component-id="schematic_component_r1"')
  expect(svg).toContain('data-schematic-component-id="schematic_component_c1"')

  // One labeled panel per sheet, ordered by sheet_index.
  expect(svg).toContain('data-schematic-sheet-id="schematic_sheet_1"')
  expect(svg).toContain('data-schematic-sheet-id="schematic_sheet_2"')
  expect(svg).toContain("Sheet 1 res")
  expect(svg).toContain("Sheet 2 cap")

  // Two nested sheet svgs are stacked vertically (second offset below first).
  const nestedYs = [...svg.matchAll(/<svg[^>]*\sy="(\d+)"/g)].map((m) =>
    Number(m[1] ?? "0"),
  )
  expect(nestedYs.length).toBe(2)
  expect(nestedYs[1] ?? 0).toBeGreaterThan(nestedYs[0] ?? 0)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

function createMultiSheetCircuitJson(): AnyCircuitElement[] {
  return [
    // Sheet 2 (capacitor) is declared first to verify the stack is ordered by
    // sheet_index, not by declaration order.
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_2",
      name: "Sheet 2 cap",
      display_name: "Sheet 2 cap",
      sheet_index: 1,
    } as AnyCircuitElement,
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_1",
      name: "Sheet 1 res",
      display_name: "Sheet 1 res",
      sheet_index: 0,
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
      source_component_id: "source_component_c1",
      name: "C1",
      ftype: "simple_capacitor",
      capacitance: 1e-6,
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
      source_port_id: "source_port_c1_1",
      name: "left",
      source_component_id: "source_component_c1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_c1_2",
      name: "right",
      source_component_id: "source_component_c1",
    },
    // Sheet 1: resistor, sheet_index 0 frame is centered at the origin.
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
    // Sheet 2: capacitor, sheet_index 1 frame is centered at x ~= 34.32, so
    // place this sheet's component inside its own frame.
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_c1",
      source_component_id: "source_component_c1",
      center: { x: 34.32, y: 0 },
      is_box_with_pins: true,
      size: { width: 1.18, height: 1.3 },
      symbol_name: "capacitor_right",
      schematic_sheet_id: "schematic_sheet_2",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_c1_1",
      source_port_id: "source_port_c1_1",
      center: { x: 33.82, y: 0 },
      facing_direction: "left",
      schematic_component_id: "schematic_component_c1",
      schematic_sheet_id: "schematic_sheet_2",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_c1_2",
      source_port_id: "source_port_c1_2",
      center: { x: 34.82, y: 0 },
      facing_direction: "right",
      schematic_component_id: "schematic_component_c1",
      schematic_sheet_id: "schematic_sheet_2",
    },
  ]
}
