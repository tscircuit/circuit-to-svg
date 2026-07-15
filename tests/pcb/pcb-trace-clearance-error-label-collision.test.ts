import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("stacks labels for co-located trace clearance errors", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 8,
      height: 6,
      thickness: 1.4,
      num_layers: 2,
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pad1",
      shape: "circle",
      x: 0,
      y: 0,
      outer_diameter: 1,
      hole_diameter: 0.5,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace1",
      route: [
        { route_type: "wire", x: -3, y: 2, width: 0.1, layer: "top" },
        { route_type: "wire", x: 0, y: 0.55, width: 0.1, layer: "top" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace2",
      route: [
        { route_type: "wire", x: 3, y: 2, width: 0.1, layer: "top" },
        { route_type: "wire", x: 0, y: 0.55, width: 0.1, layer: "top" },
      ],
    },
    {
      type: "pcb_pad_trace_clearance_error",
      error_type: "pcb_pad_trace_clearance_error",
      pcb_pad_trace_clearance_error_id: "clearance1",
      pcb_pad_id: "pad1",
      pcb_trace_id: "trace1",
      center: { x: -0.001, y: 0.525 },
      message: "Pad pad1 and trace trace1 are too close",
    },
    {
      type: "pcb_pad_trace_clearance_error",
      error_type: "pcb_pad_trace_clearance_error",
      pcb_pad_trace_clearance_error_id: "clearance2",
      pcb_pad_id: "pad1",
      pcb_trace_id: "trace2",
      center: { x: 0.001, y: 0.525 },
      message: "Pad pad1 and trace trace2 are too close",
    },
  ] as AnyCircuitElement[]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    shouldDrawErrors: true,
  })
  const labelYs = Array.from(
    svg.matchAll(
      /<text[^>]*y="([^"]+)"[^>]*data-type="pcb_pad_trace_clearance_error"/g,
    ),
  ).map((match) => Number(match[0].split('y="')[1]!.split('"')[0]))

  expect(labelYs).toHaveLength(2)
  expect(Math.abs(labelYs[0]! - labelYs[1]!)).toBeGreaterThanOrEqual(16)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
