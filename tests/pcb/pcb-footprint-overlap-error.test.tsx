import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const soup: AnyCircuitElement[] = [
  {
    type: "source_component",
    source_component_id: "generic_0",
    name: "R1",
    supplier_part_numbers: {},
  } as any,
  {
    type: "pcb_component",
    source_component_id: "generic_0",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    center: { x: 0, y: 0 },
    rotation: 0,
    width: 2,
    height: 2,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_0",
    source_port_id: "source_port_0",
    pcb_component_id: "pcb_component_0",
    x: -1,
    y: 0,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    pcb_component_id: "pcb_component_0",
    x: 1,
    y: 0,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_0",
    shape: "rect",
    x: -0.3,
    y: 0,
    width: 1,
    height: 1,
    layer: "top",
    pcb_component_id: "pcb_component_0",
    pcb_port_id: "pcb_port_0",
  } as any,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    shape: "rect",
    x: 0.4,
    y: 0,
    width: 1,
    height: 1,
    layer: "top",
    pcb_component_id: "pcb_component_0",
    pcb_port_id: "pcb_port_1",
  } as any,
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_0",
    shape: "circle",
    x: 0.1,
    y: 0.6,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["top", "bottom"],
    pcb_component_id: "pcb_component_0",
  } as any,
  {
    type: "pcb_footprint_overlap_error",
    pcb_error_id: "overlap_error_0",
    error_type: "pcb_footprint_overlap_error",
    message: "SMT pads and plated hole overlap detected",
    pcb_smtpad_ids: ["pcb_smtpad_0", "pcb_smtpad_1"],
    pcb_plated_hole_ids: ["pcb_plated_hole_0"],
  } as any,
] as AnyCircuitElement[]

test("pcb_footprint_overlap_error without shouldDrawErrors", () => {
  const svg = convertCircuitJsonToPcbSvg(soup)
  // Should not contain error indicators
  expect(svg).not.toContain('data-type="pcb_footprint_overlap_error"')
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-footprint-overlap-error-false",
  )
})

test("pcb_footprint_overlap_error with shouldDrawErrors", () => {
  const svg = convertCircuitJsonToPcbSvg(soup, { shouldDrawErrors: true })
  // Should contain error indicators
  expect(svg).toContain('data-type="pcb_footprint_overlap_error"')
  expect(svg).toContain("SMT pads and plated hole overlap detected")
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-footprint-overlap-error-visible",
  )
})
