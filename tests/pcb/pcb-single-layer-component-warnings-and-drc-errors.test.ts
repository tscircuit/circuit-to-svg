import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    center: { x: 0, y: 0 },
    width: 20,
    height: 14,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  } as any,
  {
    type: "pcb_component",
    pcb_component_id: "comp_bottom_1",
    source_component_id: "src_bottom_1",
    layer: "bottom",
    center: { x: 4, y: 3 },
    width: 3,
    height: 2,
    rotation: 0,
    position_mode: "relative_to_group_anchor",
    positioned_relative_to_pcb_board_id: "board_1",
    display_offset_x: "4mm",
    display_offset_y: "3mm",
  } as any,
  {
    type: "pcb_component",
    pcb_component_id: "comp_bottom_2",
    source_component_id: "src_bottom_2",
    layer: "bottom",
    center: { x: 5, y: 3 },
    width: 3,
    height: 2,
    rotation: 0,
  } as any,
  {
    type: "pcb_connector_not_in_accessible_orientation_warning",
    pcb_connector_not_in_accessible_orientation_warning_id: "warn_bottom_1",
    warning_type: "pcb_connector_not_in_accessible_orientation_warning",
    pcb_component_id: "comp_bottom_1",
    message: "Bottom connector orientation warning",
  } as any,
  {
    type: "pcb_courtyard_overlap_error",
    pcb_error_id: "err_courtyard_bottom",
    error_type: "pcb_courtyard_overlap_error",
    pcb_component_ids: ["comp_bottom_1", "comp_bottom_2"],
    message: "Bottom courtyard overlap error",
  } as any,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_bottom_1",
    pcb_component_id: "comp_bottom_1",
    x: 3.5,
    y: 3,
    width: 0.8,
    height: 0.8,
    layer: "bottom",
    shape: "rect",
  } as any,
  {
    type: "pcb_port",
    pcb_port_id: "port_bottom_1",
    pcb_component_id: "comp_bottom_1",
    x: 3.5,
    y: 3,
    layers: ["bottom"],
  } as any,
  {
    type: "pcb_port",
    pcb_port_id: "port_bottom_2",
    pcb_component_id: "comp_bottom_2",
    x: 5.5,
    y: 3,
    layers: ["bottom"],
  } as any,
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_bottom_1",
    route: [
      { route_type: "wire", x: 3.5, y: 3, width: 0.2, layer: "bottom" },
      { route_type: "wire", x: 5.5, y: 3, width: 0.2, layer: "bottom" },
    ],
  } as any,
  {
    type: "pcb_pad_trace_clearance_error",
    pcb_error_id: "err_clearance_bottom",
    error_type: "pcb_pad_trace_clearance_error",
    pcb_pad_id: "pad_bottom_1",
    pcb_trace_id: "trace_bottom_1",
    minimum_clearance: 0.2,
    actual_clearance: 0.05,
    center: { x: 4, y: 3 },
    message: "Bottom pad trace clearance error",
  } as any,
  {
    type: "pcb_trace_error",
    pcb_trace_error_id: "err_trace_bottom",
    error_type: "pcb_trace_error",
    pcb_trace_id: "trace_bottom_1",
    pcb_component_ids: ["comp_bottom_1", "comp_bottom_2"],
    pcb_port_ids: ["port_bottom_1", "port_bottom_2"],
    center: { x: 4.5, y: 3 },
    message: "Bottom trace routing error",
  } as any,
]

test("single-layer top PCB render omits bottom-layer component anchor offsets, warnings, and DRC errors", () => {
  const topSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "top",
    showAnchorOffsets: true,
    shouldDrawWarnings: true,
    shouldDrawErrors: true,
    colorOverrides: {
      debugComponent: {
        fill: "rgba(255, 0, 0, 0.1)",
        stroke: "rgb(255, 0, 0)",
      },
    },
  })

  expect(topSvg).not.toContain('data-type="pcb_component"')
  expect(topSvg).not.toContain("anchor-offset-dimension")
  expect(topSvg).not.toContain("Bottom connector orientation warning")
  expect(topSvg).not.toContain("Bottom courtyard overlap error")
  expect(topSvg).not.toContain("Bottom pad trace clearance error")
  expect(topSvg).not.toContain("Bottom trace routing error")

  const bottomSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "bottom",
    showAnchorOffsets: true,
    shouldDrawWarnings: true,
    shouldDrawErrors: true,
    colorOverrides: {
      debugComponent: {
        fill: "rgba(255, 0, 0, 0.1)",
        stroke: "rgb(255, 0, 0)",
      },
    },
  })

  expect(bottomSvg).toContain('data-type="pcb_component"')
  expect(bottomSvg).toContain("anchor-offset-dimension")
  expect(bottomSvg).toContain("Bottom connector orientation warning")
  expect(bottomSvg).toContain("Bottom courtyard overlap error")
  expect(bottomSvg).toContain("Bottom pad trace clearance error")
  expect(bottomSvg).toContain("Bottom trace routing error")
})
