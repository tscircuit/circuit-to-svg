import { expect, test } from "bun:test"
import { checkViaTraceClearance } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 6,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    min_trace_to_pad_edge_clearance: 0.1,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "clearance_trace",
    route: [
      { route_type: "wire", x: -3, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: 3, y: 0, width: 0.2, layer: "top" },
    ],
  },
  {
    type: "pcb_via",
    pcb_via_id: "clearance_via",
    x: 0,
    y: 0.35,
    outer_diameter: 0.4,
    hole_diameter: 0.2,
    layers: ["top", "bottom"],
  },
]

test("renders a real pcb_via_trace_clearance_error", () => {
  const errors = checkViaTraceClearance(circuitJson)

  expect(errors).toHaveLength(1)
  const error = errors[0]!
  expect(error.type).toBe("pcb_via_trace_clearance_error")
  expect(error.actual_clearance).toBeLessThan(error.minimum_clearance ?? 0)

  const svg = convertCircuitJsonToPcbSvg([...circuitJson, error], {
    shouldDrawErrors: true,
  })

  expect(svg).toContain('data-type="pcb_via_trace_clearance_error"')
  expect(svg).toContain('data-error-reference="trace-start"')
  expect(svg).toContain('data-error-reference="trace-end"')
  expect(svg).toContain('data-error-reference="obstacle"')
  expect(svg).toContain(error.message)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
