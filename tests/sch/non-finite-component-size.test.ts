import { expect, test } from "bun:test"
import type { AnyCircuitElement, SchematicComponent } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getSchematicBoundsFromCircuitJson } from "lib/sch/get-schematic-bounds-from-circuit-json"

function getComponent(size: SchematicComponent["size"]): SchematicComponent {
  return {
    type: "schematic_component",
    schematic_component_id: "sch_u1",
    source_component_id: "source_u1",
    center: { x: 20, y: 10 },
    size,
    is_box_with_pins: true,
  }
}

for (const dimension of ["width", "height"] as const) {
  for (const invalidSize of [Number.NaN, Infinity, -Infinity]) {
    test(`${dimension}=${invalidSize} preserves finite SVG geometry and viewport bounds`, () => {
      const size = { width: 4, height: 2, [dimension]: invalidSize }
      const component = getComponent(size)
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "source_component",
          source_component_id: "source_u1",
          name: "U1",
          ftype: "simple_chip",
        },
        component,
        {
          type: "source_port",
          source_port_id: "source_pin1",
          source_component_id: "source_u1",
          name: "EN",
        },
        {
          type: "schematic_port",
          schematic_port_id: "sch_pin1",
          source_port_id: "source_pin1",
          schematic_component_id: "sch_u1",
          center: { x: 17.6, y: 10 },
          side_of_component: "left",
          pin_number: 1,
          display_pin_label: "EN",
        },
        {
          ...getComponent({ width: 2, height: 2 }),
          schematic_component_id: "sch_u2",
          center: { x: -10, y: -5 },
        },
      ]

      const bounds = getSchematicBoundsFromCircuitJson(circuitJson, 0)
      expect(bounds.minX).toBe(-11)
      expect(bounds.minY).toBe(-6)
      expect(bounds.maxX).toBe(dimension === "width" ? 20 : 22)
      expect(bounds.maxY).toBe(dimension === "height" ? 10.1 : 11)

      const svg = convertCircuitJsonToSchematicSvg(circuitJson)
      expect(svg).not.toMatch(/NaN|Infinity/)
      expect(svg).toContain("sch-component-body")
      expect(svg).toContain("sch-component-overlay")
      expect(svg).toContain("sch-pin-number")
      expect(svg).toContain("EN")
      expect(component.size).toBe(size)
      expect(Object.is(component.size[dimension], invalidSize)).toBe(true)
    })
  }
}

test("finite component sizes retain their exact bounds", () => {
  expect(
    getSchematicBoundsFromCircuitJson(
      [getComponent({ width: 4.125, height: 2.25 })],
      0,
    ),
  ).toEqual({ minX: 17.9375, maxX: 22.0625, minY: 8.875, maxY: 11.125 })
})
