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
    pcb_trace_id: "upper_trace",
    source_trace_id: "upper_source_trace",
    route: [
      { route_type: "wire", x: -3, y: 1.15, width: 0.2, layer: "top" },
      { route_type: "wire", x: 2, y: 1.15, width: 0.2, layer: "top" },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "lower_trace",
    source_trace_id: "lower_source_trace",
    route: [
      { route_type: "wire", x: -2, y: -1.15, width: 0.2, layer: "top" },
      { route_type: "wire", x: 3, y: -1.15, width: 0.2, layer: "top" },
    ],
  },
] as AnyCircuitElement[]

test("two nearby clearance errors point to their offending trace segments", () => {
  const errors = checkPadTraceClearance(circuitJson)

  expect(errors).toHaveLength(2)
  expect(
    errors.every((error) => error.type === "pcb_pad_trace_clearance_error"),
  ).toBe(true)

  const svg = convertCircuitJsonToPcbSvg([...circuitJson, ...errors], {
    shouldDrawErrors: true,
    showErrorsInTextOverlay: true,
  })

  expect(svg.match(/data-error-reference="trace-segment"/g)).toHaveLength(2)
  expect(svg.match(/data-error-reference="obstacle"/g)).toHaveLength(2)
  const localLabels =
    svg.match(/<text\b[^>]*data-type="pcb_pad_trace_clearance_error"[^>]*>/g) ??
    []
  expect(localLabels).toHaveLength(2)

  const labelYPositions = localLabels.map((label) => {
    const y = label.match(/\by="([^"]+)"/)?.[1]
    if (y === undefined) throw new Error("Expected clearance label y position")
    return Number(y)
  })
  expect(Math.abs(labelYPositions[0]! - labelYPositions[1]!)).toBeGreaterThan(
    20,
  )
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
