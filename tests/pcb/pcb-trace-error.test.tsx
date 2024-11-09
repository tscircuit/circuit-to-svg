import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const soup = [
  {
    type: "source_component",
    source_component_id: "generic_0",
    name: "R1",
    supplier_part_numbers: {},
  },
  {
    type: "schematic_component",
    schematic_component_id: "schematic_generic_component_0",
    source_component_id: "generic_0",
    center: { x: 0, y: 0 },
    rotation: 0,
    size: { width: 0, height: 0 },
  },
  {
    type: "pcb_component",
    source_component_id: "generic_0",
    pcb_component_id: "pcb_generic_component_0",
    layer: "top",
    center: { x: 0, y: 0 },
    rotation: 0,
    width: 0,
    height: 0,
  },
  {
    type: "pcb_smtpad",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_smtpad_id: "pcb_smtpad_0",
    shape: "rect",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  },
  {
    type: "pcb_smtpad",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_smtpad_id: "pcb_smtpad_1",
    shape: "rect",
    x: 4,
    y: 4,
    width: 1,
    height: 1,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_0",
    source_port_id: "source_port_0",
    x: 0,
    y: 0,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    x: 4,
    y: 4,
  },
  {
    type: "pcb_trace",
    route: [
      { x: 0, y: 0, start_pcb_port_id: "pcb_port_0" },
      { x: 4, y: 4, end_pcb_port_id: "pcb_port_1" },
    ],
  },
  {
    type: "pcb_trace_error",
    message: "Trace error",
    center: { x: 3, y: 1 },
    pcb_port_ids: ["pcb_port_0", "pcb_port_1"],
    error_type: "pcb_trace_error",
    pcb_component_ids: ["pcb_generic_component_0"],
    pcb_trace_error_id: "pcb_error_0",
    pcb_trace_id: "pcb_trace_0",
    source_trace_id: "source_trace_0",
  },
]

test("shouldDrawErrors false", () => {
  expect(convertCircuitJsonToPcbSvg(soup)).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-trace-error-shouldDrawErrors-false",
  )
})
test("shouldDrawErrors true", () => {
  expect(
    convertCircuitJsonToPcbSvg(soup, { shouldDrawErrors: true }),
  ).toMatchSvgSnapshot(import.meta.path, "pcb-trace-error-shouldDrawErrors")
})
