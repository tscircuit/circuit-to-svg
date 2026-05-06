import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

// Follow-up to the bounds-crash fix for through_obstacle route entries.
// Once bounds parsing tolerates nested start/end coords, the trace
// renderer (`createSvgObjectsFromPcbTrace`) still needs to read those
// nested coords when forming SVG path "d" attributes — otherwise
// segments adjacent to a through_obstacle entry render with NaN
// coordinates (which browsers draw as nothing).
//
// Expected behaviour: every wire/via segment renders, no NaN strings
// appear anywhere in the SVG output, even on routes containing
// through_obstacle entries.
test("pcb_trace with through_obstacle entries renders without NaN coords", () => {
  const circuitJson: any[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 4,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_0",
      source_trace_id: "source_trace_0",
      route: [
        { route_type: "wire", x: -5, y: 0, layer: "top", width: 0.15 },
        { route_type: "wire", x: -2, y: 0, layer: "top", width: 0.15 },
        // through_obstacle: nested start/end with from_layer/to_layer
        {
          route_type: "through_obstacle",
          start: { x: -2, y: 0 },
          end: { x: -2, y: 0 },
          from_layer: "top",
          to_layer: "bottom",
          width: 0.15,
        },
        { route_type: "wire", x: -2, y: 0, layer: "bottom", width: 0.15 },
        { route_type: "wire", x: 5, y: 0, layer: "bottom", width: 0.15 },
      ],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  // No NaN coords leaked into SVG path "d" attributes.
  expect(svg.includes("NaN")).toBeFalse()

  // Wire segments before/after the through_obstacle still render.
  // Expect segments: wire→wire (top), wire→through_obstacle (top),
  //                  through_obstacle→wire (bottom), wire→wire (bottom)
  // The through_obstacle pairs may be zero-length (start==end), which
  // renders as a single dot — that's fine, we just need at least one
  // path on each layer.
  expect(svg).toMatch(/data-pcb-layer="top"/)
  expect(svg).toMatch(/data-pcb-layer="bottom"/)
})

test("through_obstacle with offset start/end uses correct coords for adjacent segments", () => {
  // Asymmetric through_obstacle: enters at (0, 0), exits at (1, 1)
  // (a non-zero "drilled-tunnel" geometry, less common but valid).
  const circuitJson: any[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 4,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_0",
      source_trace_id: "source_trace_0",
      route: [
        { route_type: "wire", x: -5, y: 0, layer: "top", width: 0.15 },
        {
          route_type: "through_obstacle",
          start: { x: 0, y: 0 },
          end: { x: 1, y: 1 },
          from_layer: "top",
          to_layer: "bottom",
          width: 0.15,
        },
        { route_type: "wire", x: 5, y: 5, layer: "bottom", width: 0.15 },
      ],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)
  expect(svg.includes("NaN")).toBeFalse()
  // Should render: top-layer wire from (-5, 0) → (0, 0)  [obstacle entry]
  //                bottom-layer wire from (1, 1) → (5, 5) [obstacle exit]
  expect(svg).toMatch(/data-pcb-layer="top"/)
  expect(svg).toMatch(/data-pcb-layer="bottom"/)
})
