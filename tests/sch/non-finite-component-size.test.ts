import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getSchematicBoundsFromCircuitJson } from "lib/sch/get-schematic-bounds-from-circuit-json"

const circuitWithSize = (size: { width: number; height: number }): any => [
  {
    type: "schematic_component",
    schematic_component_id: "sc1",
    center: { x: 0, y: 0 },
    rotation: 0,
    size,
    pin_spacing: 0.2,
    port_labels: {},
    source_component_id: "src1",
  },
  {
    type: "source_component",
    source_component_id: "src1",
    ftype: "simple_chip",
    name: "U1",
  },
  {
    type: "schematic_port",
    schematic_port_id: "sp1",
    schematic_component_id: "sc1",
    center: { x: 0.5, y: 0.3 },
    source_port_id: "p1",
    facing_direction: "right",
    side_of_component: "right",
    distance_from_component_edge: 0.4,
    pin_number: 1,
    display_pin_label: "VCC",
  },
]

test("a non-finite component width does not put NaN in the schematic", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    circuitWithSize({ width: Number.NaN, height: 1 }),
  )

  expect(svg).not.toContain("NaN")
  expect(svg).toContain('class="component chip sch-component-body"')
  expect(svg).toContain("VCC")
})

test("a non-finite component height does not put NaN in the schematic", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    circuitWithSize({ width: 1, height: Number.NaN }),
  )

  expect(svg).not.toContain("NaN")
  expect(svg).toContain('class="component chip sch-component-body"')
  expect(svg).toContain("VCC")
})

test("infinite component dimensions fall back without corrupting schematic bounds", () => {
  const circuit = [
    ...circuitWithSize({
      width: Number.POSITIVE_INFINITY,
      height: Number.NEGATIVE_INFINITY,
    }),
    {
      type: "schematic_port",
      schematic_port_id: "sp2",
      schematic_component_id: "sc1",
      center: { x: 4, y: 2 },
      source_port_id: "p2",
    },
  ] as any

  const bounds = getSchematicBoundsFromCircuitJson(circuit)
  expect(Number.isFinite(bounds.minX)).toBe(true)
  expect(Number.isFinite(bounds.minY)).toBe(true)
  expect(Number.isFinite(bounds.maxX)).toBe(true)
  expect(Number.isFinite(bounds.maxY)).toBe(true)
  expect(bounds.maxX).toBeGreaterThan(4)
  expect(bounds.maxY).toBeGreaterThan(2)

  const svg = convertCircuitJsonToSchematicSvg(circuit)
  expect(svg).not.toContain("NaN")
  expect(svg).not.toContain("Infinity")
})

test("the component body is still drawn at the right size for valid input", () => {
  const widthFor = (width: number) => {
    const svg = convertCircuitJsonToSchematicSvg(
      circuitWithSize({ width, height: 1 }),
    )
    const body =
      svg.match(/class="component chip sch-component-body"[^>]*/)?.[0] ?? ""
    return Number(body.match(/ width="([^"]+)"/)?.[1])
  }

  const single = widthFor(1)
  const double = widthFor(2)

  expect(single).toBeGreaterThan(0)
  expect(double / single).toBeCloseTo(2, 6)
})
