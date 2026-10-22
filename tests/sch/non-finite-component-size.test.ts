import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"

// NOTE: these use Number.NaN rather than null on purpose. An unparseable unit
// string reaches the renderer as NaN in memory; it only becomes null after JSON
// serialisation, and null / 2 === 0 renders harmlessly. A null-based fixture
// would pass even without the fix.

test("a schematic component with non-finite size does not emit NaN coordinates", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_component",
      schematic_component_id: "comp1",
      center: { x: 0, y: 0 },
      size: { width: Number.NaN, height: 1 },
    },
  ] as any)

  expect(svg).not.toContain("NaN")
  expect(svg).toContain('class="component chip sch-component-body"')
})

test("a schematic component with both width and height NaN does not emit NaN", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_component",
      schematic_component_id: "comp2",
      center: { x: 2, y: 3 },
      size: { width: Number.NaN, height: Number.NaN },
    },
  ] as any)

  expect(svg).not.toContain("NaN")
})

test("a schematic component with valid dimensions renders verbatim", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_component",
      schematic_component_id: "comp1",
      center: { x: 0, y: 0 },
      size: { width: 2, height: 1 },
    },
  ] as any)

  expect(svg).not.toContain("NaN")
  expect(svg).toContain('class="component chip sch-component-body"')
})

test("non-finite component size does not corrupt bounds of other components", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_component",
      schematic_component_id: "valid_comp",
      center: { x: 10, y: 10 },
      size: { width: 4, height: 4 },
    },
    {
      type: "schematic_component",
      schematic_component_id: "nan_comp",
      center: { x: 0, y: 0 },
      size: { width: Number.NaN, height: 2 },
    },
  ] as any)

  expect(svg).not.toContain("NaN")
})
