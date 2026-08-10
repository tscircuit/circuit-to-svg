import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { symbols } from "schematic-symbols"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

// No packaged schematic symbol defines "box" primitives, so we register a
// throwaway symbol that does. This exercises the box drawing path in
// create-svg-objects-from-sch-component-with-symbol.ts, which used to paint
// every box with a hardcoded fill="red".
const symbolName = "test_symbol_with_box"
;(symbols as any)[symbolName] = {
  center: { x: 0, y: 0 },
  size: { width: 2, height: 1 },
  ports: [
    { x: -1, y: 0, labels: ["pin1"] },
    { x: 1, y: 0, labels: ["pin2"] },
  ],
  primitives: [
    {
      type: "path",
      color: "primary",
      closed: true,
      points: [
        { x: -1, y: -0.5 },
        { x: 1, y: -0.5 },
        { x: 1, y: 0.5 },
        { x: -1, y: 0.5 },
      ],
    },
    {
      type: "box",
      x: -1,
      y: -0.5,
      width: 2,
      height: 1,
      anchor: "top_left",
    },
  ],
}

const circuitJson: AnyCircuitElement[] = [
  {
    type: "source_component",
    source_component_id: "source_component_1",
    name: "U1",
    ftype: "simple_chip",
  } as any,
  {
    type: "schematic_component",
    schematic_component_id: "schematic_component_1",
    source_component_id: "source_component_1",
    symbol_name: symbolName,
    center: { x: 0, y: 0 },
    size: { width: 2, height: 1 },
    rotation: 0,
  } as any,
  {
    type: "source_port",
    source_port_id: "source_port_1",
    source_component_id: "source_component_1",
    name: "pin1",
  } as any,
  {
    type: "source_port",
    source_port_id: "source_port_2",
    source_component_id: "source_component_1",
    name: "pin2",
  } as any,
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_1",
    schematic_component_id: "schematic_component_1",
    source_port_id: "source_port_1",
    center: { x: -1, y: 0 },
    facing_direction: "left",
  } as any,
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_2",
    schematic_component_id: "schematic_component_1",
    source_port_id: "source_port_2",
    center: { x: 1, y: 0 },
    facing_direction: "right",
  } as any,
]

test("schematic symbol box uses a themed fill, not hardcoded red", () => {
  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  const boxMatch = svg.match(/<rect[^>]*class="sch-component-symbol-box"[^>]*>/)
  expect(boxMatch).not.toBeNull()
  const boxTag = boxMatch![0]

  expect(boxTag).not.toContain('fill="red"')
  expect(boxTag).toContain('fill="rgb(255, 255, 194)"')
  expect(boxTag).toContain('stroke="rgb(132, 0, 0)"')

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
