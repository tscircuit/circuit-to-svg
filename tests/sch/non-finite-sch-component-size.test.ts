import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getSchematicBoundsFromCircuitJson } from "lib/sch/get-schematic-bounds-from-circuit-json"

function buildCircuitWithComponentSize(size: {
  width: number
  height: number
}): AnyCircuitElement[] {
  return [
    {
      type: "source_component",
      source_component_id: "source_chip_0",
      name: "U1",
      ftype: "simple_chip",
    },
    {
      type: "source_port",
      source_port_id: "source_port_0",
      source_component_id: "source_chip_0",
      name: "VCC",
      pin_number: 1,
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_chip_0",
      source_component_id: "source_chip_0",
      center: { x: 0, y: 0 },
      size,
      is_box_with_pins: true,
    },
    {
      type: "schematic_port",
      schematic_port_id: "sch_port_0",
      schematic_component_id: "sch_chip_0",
      source_port_id: "source_port_0",
      center: { x: -1.4, y: 0 },
      facing_direction: "left",
      side_of_component: "left",
      distance_from_component_edge: 0.4,
      pin_number: 1,
      display_pin_label: "VCC",
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_chip_valid",
      source_component_id: "source_chip_1",
      center: { x: 8, y: 4 },
      size: { width: 2, height: 1.6 },
      is_box_with_pins: true,
    },
  ]
}

test("degrades non-finite schematic_component size to valid SVG lengths without emitting NaN or Infinity", () => {
  const zeroWidthCircuit = buildCircuitWithComponentSize({
    width: 0,
    height: 1.6,
  })
  const zeroWidthSvg = convertCircuitJsonToSchematicSvg(zeroWidthCircuit)

  for (const nonFiniteSize of [
    { width: Number.NaN, height: 1.6 },
    { width: 2, height: Number.NaN },
    { width: Number.NaN, height: Number.NaN },
    { width: Number.POSITIVE_INFINITY, height: 1.6 },
    { width: 2, height: Number.POSITIVE_INFINITY },
    { width: Number.NEGATIVE_INFINITY, height: Number.POSITIVE_INFINITY },
  ]) {
    const circuit = buildCircuitWithComponentSize(nonFiniteSize)
    const bounds = getSchematicBoundsFromCircuitJson(circuit)
    expect(Number.isFinite(bounds.minX)).toBe(true)
    expect(Number.isFinite(bounds.minY)).toBe(true)
    expect(Number.isFinite(bounds.maxX)).toBe(true)
    expect(Number.isFinite(bounds.maxY)).toBe(true)
    // Sibling component at (8, 4) with size 2x1.6 must remain inside computed bounds
    expect(bounds.maxX).toBeGreaterThanOrEqual(9)
    expect(bounds.maxY).toBeGreaterThanOrEqual(4.8)

    const svg = convertCircuitJsonToSchematicSvg(circuit)
    expect(svg).not.toContain("NaN")
    expect(svg).not.toContain("Infinity")
    expect(svg.match(/sch-component-body/g)).toHaveLength(2)
  }

  const nanWidthSvg = convertCircuitJsonToSchematicSvg(
    buildCircuitWithComponentSize({ width: Number.NaN, height: 1.6 }),
  )
  expect(nanWidthSvg).toBe(zeroWidthSvg)

  const finiteSvg = convertCircuitJsonToSchematicSvg(
    buildCircuitWithComponentSize({ width: 2.4, height: 1.6 }),
  )
  expect(finiteSvg).not.toContain("NaN")
  expect(finiteSvg).toContain('class="component chip sch-component-body"')
  expect(finiteSvg).not.toBe(zeroWidthSvg)

  const warningSvg = convertCircuitJsonToSchematicSvg(
    [
      ...buildCircuitWithComponentSize({ width: Number.NaN, height: 1.6 }),
      {
        type: "schematic_component_styling_warning",
        schematic_component_styling_warning_id: "sch_warning_0",
        warning_type: "schematic_component_styling_warning",
        styling_issue_type: "invalid_sch_width",
        schematic_component_id: "sch_chip_0",
        source_component_id: "source_chip_0",
        message: "Invalid schWidth value",
      },
    ],
    { shouldDrawWarnings: true },
  )
  expect(warningSvg).not.toContain("NaN")
  expect(warningSvg).not.toContain("Infinity")
  expect(warningSvg).toContain("Invalid schWidth value")
})
