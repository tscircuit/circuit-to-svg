import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const soup: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 1, y: 0 },
    width: 6,
    height: 4,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  } as any,
  {
    type: "source_component",
    source_component_id: "source_U1",
    name: "U1",
    ftype: "simple_chip",
  } as any,
  {
    type: "source_component",
    source_component_id: "source_U2",
    name: "U2",
    ftype: "simple_chip",
  } as any,
  {
    type: "pcb_component",
    pcb_component_id: "pcb_U1",
    source_component_id: "source_U1",
    layer: "top",
    center: { x: 0, y: 0 },
    width: 2.26,
    height: 1.94,
    rotation: 0,
  } as any,
  {
    type: "pcb_component",
    pcb_component_id: "pcb_U2",
    source_component_id: "source_U2",
    layer: "top",
    center: { x: 2, y: 0 },
    width: 2.26,
    height: 1.94,
    rotation: 0,
  } as any,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_u1_1",
    pcb_component_id: "pcb_U1",
    x: -0.51,
    y: 0,
    width: 0.54,
    height: 0.64,
    layer: "top",
    shape: "rect",
    port_hints: ["1"],
  } as any,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_u1_2",
    pcb_component_id: "pcb_U1",
    x: 0.51,
    y: 0,
    width: 0.54,
    height: 0.64,
    layer: "top",
    shape: "rect",
    port_hints: ["2"],
  } as any,
  {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "crtyd_u1",
    pcb_component_id: "pcb_U1",
    center: { x: -0.1, y: 0 },
    width: 2.26,
    height: 1.94,
    layer: "top",
  } as any,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_u2_1",
    pcb_component_id: "pcb_U2",
    x: 1.59,
    y: 0,
    width: 0.54,
    height: 0.64,
    layer: "top",
    shape: "rect",
    port_hints: ["1"],
  } as any,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_u2_2",
    pcb_component_id: "pcb_U2",
    x: 2.61,
    y: 0,
    width: 0.54,
    height: 0.64,
    layer: "top",
    shape: "rect",
    port_hints: ["2"],
  } as any,
  {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "crtyd_u2",
    pcb_component_id: "pcb_U2",
    center: { x: 2, y: 0 },
    width: 2.26,
    height: 1.94,
    layer: "top",
  } as any,
  {
    type: "pcb_courtyard_overlap_error",
    pcb_error_id: "pcb_error_courtyard_overlap_1",
    error_type: "pcb_courtyard_overlap_error",
    message: "courtyard of U1 overlaps with courtyard of U2",
    pcb_component_ids: ["pcb_U1", "pcb_U2"],
  } as any,
]

test("pcb_courtyard_overlap_error with shouldDrawErrors", () => {
  const svg = convertCircuitJsonToPcbSvg(soup, {
    shouldDrawErrors: true,
    showCourtyards: true,
  })
  expect(svg).toContain('data-type="pcb_courtyard_overlap_error"')
  expect(svg).toContain("courtyard of U1 overlaps with courtyard of U2")
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-courtyard-overlap-error-visible",
  )
})
