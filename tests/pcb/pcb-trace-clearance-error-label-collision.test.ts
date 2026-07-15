import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbPadTraceClearanceError } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import circuitJsonFixture from "../assets/repro-checks-sot23-regulator-overlap.json"

// Reproduces the co-located clearance errors from tscircuit/checks#171.
const clearanceErrors: PcbPadTraceClearanceError[] = [
  {
    type: "pcb_pad_trace_clearance_error",
    error_type: "pcb_pad_trace_clearance_error",
    pcb_pad_trace_clearance_error_id: "clearance_cin",
    pcb_pad_id: "pcb_plated_hole_1",
    pcb_trace_id: "source_trace_0__source_port_0_mst0_0",
    minimum_clearance: 0.1,
    actual_clearance: 0.000515596460781767,
    center: {
      x: -4.684558229944598,
      y: -0.2511196294869616,
    },
    message:
      "Pad pcb_plated_hole[#pcb_plated_hole_1] and trace trace[.CIN > port.pos] are too close (clearance: 0.001mm, minimum: 0.1mm)",
  },
  {
    type: "pcb_pad_trace_clearance_error",
    error_type: "pcb_pad_trace_clearance_error",
    pcb_pad_trace_clearance_error_id: "clearance_jin",
    pcb_pad_id: "pcb_plated_hole_1",
    pcb_trace_id: "source_trace_2_0",
    minimum_clearance: 0.1,
    actual_clearance: 0.00007938332108987922,
    center: {
      x: -4.684547422537605,
      y: -0.2513387933996645,
    },
    message:
      "Pad pcb_plated_hole[#pcb_plated_hole_1] and trace trace[.JIN > port.pin1] are too close (clearance: 0mm, minimum: 0.1mm)",
  },
]

test("repro: checks SOT23 regulator clearance labels do not overlap", () => {
  const circuitJson = circuitJsonFixture as AnyCircuitElement[]
  const svg = convertCircuitJsonToPcbSvg([...circuitJson, ...clearanceErrors], {
    shouldDrawErrors: true,
    showErrorsInTextOverlay: true,
  })
  const labelYs = Array.from(
    svg.matchAll(
      /<text[^>]*y="[^"]+"[^>]*data-type="pcb_pad_trace_clearance_error"/g,
    ),
  ).map((match) => Number(match[0].split('y="')[1]!.split('"')[0]))

  expect(labelYs).toHaveLength(2)
  expect(Math.abs(labelYs[0]! - labelYs[1]!)).toBeGreaterThanOrEqual(16)
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "repro-checks-sot23-regulator-overlap",
  )
})
