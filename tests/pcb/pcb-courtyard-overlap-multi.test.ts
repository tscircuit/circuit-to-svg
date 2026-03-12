import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 1, y: 0 },
    width: 8,
    height: 7,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  } as any,
  // Source components
  ...["U1", "U2", "U3"].map((name) => ({
    type: "source_component",
    source_component_id: `source_${name}`,
    name,
    ftype: "simple_chip",
  })) as AnyCircuitElement[],
  // PCB components
  {
    type: "pcb_component", pcb_component_id: "pcb_U1", source_component_id: "source_U1",
    layer: "top", center: { x: 0, y: 0 }, width: 2.26, height: 1.94, rotation: 0,
  } as any,
  {
    type: "pcb_component", pcb_component_id: "pcb_U2", source_component_id: "source_U2",
    layer: "top", center: { x: 2.0, y: 1.7 }, width: 2.26, height: 1.94, rotation: 0,
  } as any,
  {
    type: "pcb_component", pcb_component_id: "pcb_U3", source_component_id: "source_U3",
    layer: "top", center: { x: 2.0, y: -1.7 }, width: 2.26, height: 1.94, rotation: 0,
  } as any,
  // Pads — U1
  { type: "pcb_smtpad", pcb_smtpad_id: "pad_u1_1", pcb_component_id: "pcb_U1", x: -0.51, y: 0, width: 0.54, height: 0.64, layer: "top", shape: "rect" } as any,
  { type: "pcb_smtpad", pcb_smtpad_id: "pad_u1_2", pcb_component_id: "pcb_U1", x: 0.51, y: 0, width: 0.54, height: 0.64, layer: "top", shape: "rect" } as any,
  // Pads — U2
  { type: "pcb_smtpad", pcb_smtpad_id: "pad_u2_1", pcb_component_id: "pcb_U2", x: 1.49, y: 1.7, width: 0.54, height: 0.64, layer: "top", shape: "rect" } as any,
  { type: "pcb_smtpad", pcb_smtpad_id: "pad_u2_2", pcb_component_id: "pcb_U2", x: 2.51, y: 1.7, width: 0.54, height: 0.64, layer: "top", shape: "rect" } as any,
  // Pads — U3
  { type: "pcb_smtpad", pcb_smtpad_id: "pad_u3_1", pcb_component_id: "pcb_U3", x: 1.49, y: -1.7, width: 0.54, height: 0.64, layer: "top", shape: "rect" } as any,
  { type: "pcb_smtpad", pcb_smtpad_id: "pad_u3_2", pcb_component_id: "pcb_U3", x: 2.51, y: -1.7, width: 0.54, height: 0.64, layer: "top", shape: "rect" } as any,
  // Courtyards
  { type: "pcb_courtyard_rect", pcb_courtyard_rect_id: "crtyd_u1", pcb_component_id: "pcb_U1", center: { x: 0, y: 0 }, width: 2.26, height: 1.94, layer: "top" } as any,
  { type: "pcb_courtyard_rect", pcb_courtyard_rect_id: "crtyd_u2", pcb_component_id: "pcb_U2", center: { x: 2.0, y: 1.7 }, width: 2.26, height: 1.94, layer: "top" } as any,
  { type: "pcb_courtyard_rect", pcb_courtyard_rect_id: "crtyd_u3", pcb_component_id: "pcb_U3", center: { x: 2.0, y: -1.7 }, width: 2.26, height: 1.94, layer: "top" } as any,
  // Errors: U1↔U2 (top-right), U1↔U3 (bottom-right)
  {
    type: "pcb_courtyard_overlap_error",
    pcb_error_id: "pcb_error_1",
    error_type: "pcb_courtyard_overlap_error",
    message: "courtyard of U1 overlaps with courtyard of U2",
    pcb_component_ids: ["pcb_U1", "pcb_U2"],
  } as any,
  {
    type: "pcb_courtyard_overlap_error",
    pcb_error_id: "pcb_error_2",
    error_type: "pcb_courtyard_overlap_error",
    message: "courtyard of U1 overlaps with courtyard of U3",
    pcb_component_ids: ["pcb_U1", "pcb_U3"],
  } as any,
]

test("pcb_courtyard_overlap_error: top-right and bottom-right corner overlaps, without shouldDrawErrors", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, { showCourtyards: true })
  expect(svg).not.toContain('data-type="pcb_courtyard_overlap_error"')
  expect(svg).toMatchSvgSnapshot(import.meta.path, "multi-courtyard-overlap-hidden")
})

test("pcb_courtyard_overlap_error: top-right and bottom-right corner overlaps, with shouldDrawErrors", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    shouldDrawErrors: true,
    showCourtyards: true,
  })
  expect(svg).toContain('data-type="pcb_courtyard_overlap_error"')
  expect(svg).toMatchSvgSnapshot(import.meta.path, "multi-courtyard-overlap-visible")
})
