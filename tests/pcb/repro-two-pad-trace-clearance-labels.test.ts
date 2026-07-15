import { expect, test } from "bun:test"
import { checkPadTraceClearance } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 8,
    height: 6,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "shared_plated_hole",
    shape: "circle",
    x: 0,
    y: 0,
    outer_diameter: 2,
    hole_diameter: 1,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "left_trace",
    source_trace_id: "left_source_trace",
    route: [
      { route_type: "wire", x: -1.15, y: -2, width: 0.2, layer: "top" },
      { route_type: "wire", x: -1.15, y: 2, width: 0.2, layer: "top" },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "right_trace",
    source_trace_id: "right_source_trace",
    route: [
      { route_type: "wire", x: 1.15, y: -2, width: 0.2, layer: "top" },
      { route_type: "wire", x: 1.15, y: 2, width: 0.2, layer: "top" },
    ],
  },
] as AnyCircuitElement[]

test("two nearby clearance errors keep labels in the text overlay", () => {
  const errors = checkPadTraceClearance(circuitJson)

  expect(errors).toHaveLength(2)
  expect(
    errors.every((error) => error.type === "pcb_pad_trace_clearance_error"),
  ).toBe(true)

  const svg = convertCircuitJsonToPcbSvg([...circuitJson, ...errors], {
    shouldDrawErrors: true,
    showErrorsInTextOverlay: true,
  })

  expect(svg.match(/data-error-reference="trace-start"/g)).toHaveLength(2)
  expect(svg.match(/data-error-reference="trace-end"/g)).toHaveLength(2)
  expect(svg.match(/data-error-reference="obstacle"/g)).toHaveLength(2)
  expect(
    svg.match(/<text\b[^>]*data-type="pcb_pad_trace_clearance_error"[^>]*>/g) ??
      [],
  ).toHaveLength(0)
  for (const error of errors) {
    expect(svg.split(error.message).length - 1).toBe(1)
  }
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
