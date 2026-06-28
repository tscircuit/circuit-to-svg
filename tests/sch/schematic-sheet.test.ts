import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic sheet renders linked subcircuit centered on sheet", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_1",
      name: "Main Sheet",
    },
    {
      type: "source_component",
      source_component_id: "source_component_r1",
      name: "R1",
      ftype: "simple_resistor",
      resistance: 40,
      subcircuit_id: "subcircuit_a",
    },
    {
      type: "source_port",
      source_port_id: "source_port_r1_p1",
      name: "left",
      source_component_id: "source_component_r1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_r1_p2",
      name: "right",
      source_component_id: "source_component_r1",
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_r1",
      source_component_id: "source_component_r1",
      center: { x: 0, y: 3 },
      is_box_with_pins: true,
      size: { width: 1.18, height: 1.3 },
      symbol_name: "boxresistor_right",
      subcircuit_id: "subcircuit_a",
      schematic_sheet_id: "schematic_sheet_1",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r1_p1",
      source_port_id: "source_port_r1_p1",
      center: { x: -0.5, y: 3 },
      facing_direction: "left",
      schematic_component_id: "schematic_component_r1",
      schematic_sheet_id: "schematic_sheet_1",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_r1_p2",
      source_port_id: "source_port_r1_p2",
      center: { x: 0.5, y: 3 },
      facing_direction: "right",
      schematic_component_id: "schematic_component_r1",
      schematic_sheet_id: "schematic_sheet_1",
    },
    {
      type: "schematic_text",
      schematic_text_id: "schematic_text_1",
      schematic_component_id: "schematic_component_r1",
      text: "R1",
      position: { x: -0.3, y: 2.5 },
      anchor: "left",
      rotation: 0,
      font_size: 0.2,
      color: "#006464",
      schematic_sheet_id: "schematic_sheet_1",
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    width: 1200,
    height: 800,
  })

  expect(
    svg.match(/data-schematic-component-id="schematic_component_r1"/g),
  ).toHaveLength(1)
  expect(svg).toContain('class="schematic-sheet"')
  expect(svg).toContain('data-schematic-rect-id="schematic_sheet_1_outer"')
  expect(svg).toContain(
    'data-schematic-component-id="schematic_component_r1" data-schematic-sheet-id="schematic_sheet_1"',
  )
  expect(
    svg.match(
      /class="schematic-port-hover sch-port-hover" data-schematic-port-id="source_port_r1_p[12]" data-schematic-sheet-id="schematic_sheet_1"/g,
    ),
  ).toHaveLength(2)
  expect(svg).toContain("sch-component-symbol-path")
  expect(svg).not.toContain("Main Sheet")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("schematic sheet render defaults to lowest sheet_index", () => {
  const svg = convertCircuitJsonToSchematicSvg(createMultiSheetCircuitJson())

  expect(svg).toContain('data-schematic-sheet-id="schematic_sheet_low"')
  expect(svg).toContain('data-schematic-component-id="schematic_component_low"')
  expect(svg).not.toContain('data-schematic-sheet-id="schematic_sheet_high"')
  expect(svg).not.toContain(
    'data-schematic-component-id="schematic_component_high"',
  )
})

test("schematic sheet render can target sheet id", () => {
  const svg = convertCircuitJsonToSchematicSvg(createMultiSheetCircuitJson(), {
    schematicSheetId: "schematic_sheet_high",
  })

  expect(svg).toContain('data-schematic-sheet-id="schematic_sheet_high"')
  expect(svg).toContain(
    'data-schematic-component-id="schematic_component_high"',
  )
  expect(svg).not.toContain('data-schematic-sheet-id="schematic_sheet_low"')
  expect(svg).not.toContain(
    'data-schematic-component-id="schematic_component_low"',
  )
})

test("schematic sheet render can target sheet index", () => {
  const svg = convertCircuitJsonToSchematicSvg(createMultiSheetCircuitJson(), {
    schematicSheetIndex: 2,
  })

  expect(svg).toContain('data-schematic-sheet-id="schematic_sheet_high"')
  expect(svg).toContain(
    'data-schematic-component-id="schematic_component_high"',
  )
  expect(svg).not.toContain('data-schematic-sheet-id="schematic_sheet_low"')
  expect(svg).not.toContain(
    'data-schematic-component-id="schematic_component_low"',
  )
})

function createMultiSheetCircuitJson(): AnyCircuitElement[] {
  return [
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_high",
      sheet_index: 2,
    } as AnyCircuitElement,
    {
      type: "schematic_sheet",
      schematic_sheet_id: "schematic_sheet_low",
      sheet_index: 1,
    } as AnyCircuitElement,
    {
      type: "source_component",
      source_component_id: "source_component_low",
      name: "R_LOW",
      ftype: "simple_resistor",
      resistance: 10,
    },
    {
      type: "source_component",
      source_component_id: "source_component_high",
      name: "R_HIGH",
      ftype: "simple_resistor",
      resistance: 20,
    },
    {
      type: "source_port",
      source_port_id: "source_port_low_1",
      name: "left",
      source_component_id: "source_component_low",
    },
    {
      type: "source_port",
      source_port_id: "source_port_low_2",
      name: "right",
      source_component_id: "source_component_low",
    },
    {
      type: "source_port",
      source_port_id: "source_port_high_1",
      name: "left",
      source_component_id: "source_component_high",
    },
    {
      type: "source_port",
      source_port_id: "source_port_high_2",
      name: "right",
      source_component_id: "source_component_high",
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_low",
      source_component_id: "source_component_low",
      center: { x: 0, y: 0 },
      is_box_with_pins: true,
      size: { width: 1.18, height: 1.3 },
      symbol_name: "boxresistor_right",
      schematic_sheet_id: "schematic_sheet_low",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_low_1",
      source_port_id: "source_port_low_1",
      center: { x: -0.5, y: 0 },
      facing_direction: "left",
      schematic_component_id: "schematic_component_low",
      schematic_sheet_id: "schematic_sheet_low",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_low_2",
      source_port_id: "source_port_low_2",
      center: { x: 0.5, y: 0 },
      facing_direction: "right",
      schematic_component_id: "schematic_component_low",
      schematic_sheet_id: "schematic_sheet_low",
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_high",
      source_component_id: "source_component_high",
      center: { x: 0, y: 0 },
      is_box_with_pins: true,
      size: { width: 1.18, height: 1.3 },
      symbol_name: "boxresistor_right",
      schematic_sheet_id: "schematic_sheet_high",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_high_1",
      source_port_id: "source_port_high_1",
      center: { x: -0.5, y: 0 },
      facing_direction: "left",
      schematic_component_id: "schematic_component_high",
      schematic_sheet_id: "schematic_sheet_high",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_high_2",
      source_port_id: "source_port_high_2",
      center: { x: 0.5, y: 0 },
      facing_direction: "right",
      schematic_component_id: "schematic_component_high",
      schematic_sheet_id: "schematic_sheet_high",
    },
  ]
}
