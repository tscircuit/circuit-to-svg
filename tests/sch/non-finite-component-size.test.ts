import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"

// NOTE: these use Number.NaN rather than null on purpose. An unparseable
// dimension reaches the renderer as NaN in memory; it only becomes null once the
// circuit JSON is serialised, and `null / 2` is 0, which renders harmlessly.
// A null-based fixture would pass even without the fix.

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
    distance_from_component_edge: 0.4,
    pin_number: 1,
  },
]

test("a non-finite component width does not put NaN in the schematic", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    circuitWithSize({ width: Number.NaN, height: 1 }),
  )

  expect(svg).not.toContain("NaN")
})

test("a non-finite component height does not put NaN in the schematic", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    circuitWithSize({ width: 1, height: Number.NaN }),
  )

  expect(svg).not.toContain("NaN")
})

test("the component body is still drawn at the right size for valid input", () => {
  // Guards against clamping every component to zero.
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
  // Doubling the component width must double the rendered body width.
  expect(double / single).toBeCloseTo(2, 6)
})

test("valid components render without NaN", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    circuitWithSize({ width: 2, height: 1 }),
  )

  expect(svg).not.toContain("NaN")
})
