import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("non-finite schematic component size falls back to 0 without emitting NaN", () => {
  const makeCircuit = (width: number, height: number): any => [
    {
      type: "source_component",
      source_component_id: "src_u1",
      ftype: "simple_chip",
      name: "U1",
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_u1",
      source_component_id: "src_u1",
      center: { x: 0, y: 0 },
      size: { width, height },
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_p1",
      schematic_component_id: "sch_u1",
      source_port_id: "src_p1",
      center: { x: -1, y: 0 },
      side_of_component: "left",
      pin_number: 1,
    },
  ]

  const zeroWidthSvg = convertCircuitJsonToSchematicSvg(makeCircuit(0, 2))
  for (const invalidWidth of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    const svg = convertCircuitJsonToSchematicSvg(makeCircuit(invalidWidth, 2))
    expect(svg).not.toContain("NaN")
    expect(svg).not.toContain("Infinity")
    expect(svg).toContain("sch-component-body")
    expect(svg).toBe(zeroWidthSvg)
  }

  const zeroHeightSvg = convertCircuitJsonToSchematicSvg(makeCircuit(2, 0))
  for (const invalidHeight of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    const svg = convertCircuitJsonToSchematicSvg(makeCircuit(2, invalidHeight))
    expect(svg).not.toContain("NaN")
    expect(svg).not.toContain("Infinity")
    expect(svg).toContain("sch-component-body")
    expect(svg).toBe(zeroHeightSvg)
  }
})

test("valid schematic component size renders verbatim", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "source_component",
      source_component_id: "src_u2",
      ftype: "simple_chip",
      name: "U2",
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_u2",
      source_component_id: "src_u2",
      center: { x: 1, y: 2 },
      size: { width: 2, height: 1.5 },
    },
  ] as any)

  expect(svg).not.toContain("NaN")
  expect(svg).toContain("sch-component-body")
  expect(svg).not.toContain('width="0"')
})
