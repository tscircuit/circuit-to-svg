import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { type SchSymbol, symbols } from "schematic-symbols"

test("dc_ammeter_horz renders literal symbol text", () => {
  const symbol = (symbols as unknown as Record<string, SchSymbol>)[
    "dc_ammeter_horz"
  ]!
  const literalAText = symbol.primitives.find(
    (primitive) => primitive.type === "text" && primitive.text === "A",
  )

  expect(literalAText).toBeDefined()

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_0",
      center: { x: 0, y: 0 },
      size: symbol.size,
      is_box_with_pins: true,
      symbol_name: "dc_ammeter_horz",
      symbol_display_value: "DC",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_0",
      schematic_component_id: "schematic_component_0",
      source_port_id: "source_port_0",
      center: { x: -0.54, y: 0 },
      facing_direction: "left",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_1",
      schematic_component_id: "schematic_component_0",
      source_port_id: "source_port_1",
      center: { x: 0.54, y: 0 },
      facing_direction: "right",
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson, {
    grid: {
      cellSize: 0.5,
      labelCells: true,
    },
  })

  expect(svg).toContain(">A</text>")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
