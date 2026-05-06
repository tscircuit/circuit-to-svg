import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

// Regression: route entries with `route_type: "through_obstacle"`
// nest coordinates inside `start` / `end` objects rather than at the
// top level. The pcb-bounds parser previously called distance.parse()
// on `point.x` / `point.y` directly — which throws ZodError when the
// values are undefined, crashing the entire renderer before any
// trace (including those with no through_obstacle entries) got a
// chance to draw.
//
// Expected behaviour for THIS fix: the bounds parser tolerates
// missing top-level x/y, picks up coordinates from start/end if
// present, and the SVG emits trace path elements for the wire and
// via segments.
//
// Note: the trace renderer (createSvgObjectsFromPcbTrace) itself
// also accesses `start.x` / `end.x` directly when forming SVG path
// "d" attributes, so segments adjacent to a through_obstacle entry
// will currently render with NaN coordinates. That's a separate
// follow-up — fixing it requires picking the right nested coord
// per pair direction (start.exit vs end.enter). The bounds-crash
// fix here unblocks rendering for routes WITHOUT through_obstacle
// entries (the common case for plain wire+via traces).
test("pcb_trace with through_obstacle route entries does not crash bounds parser", () => {
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
        // through_obstacle nests coords inside start/end. Used to
        // crash distance.parse(point.x) for point = this entry.
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

  // Must not throw.
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  // At least one pcb_trace path element must be emitted (the wire
  // segments before/after the through_obstacle).
  const numTracePaths = (svg.match(/data-type="pcb_trace"/g) || []).length
  expect(numTracePaths).toBeGreaterThan(0)
})

// Pure wire+via routes (the common case, no through_obstacle entries)
// also crashed under the old bounds parser if ANY OTHER pcb_trace in
// the same circuit had a through_obstacle entry — bounds is computed
// across all elements and one bad route point throws for everyone.
// This test confirms a clean wire+via route renders even when a
// sibling trace contains through_obstacle entries.
test("clean wire+via traces still render alongside through_obstacle routes", () => {
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
      // Plain wire trace — no through_obstacle, no special data shape.
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_clean",
      source_trace_id: "source_trace_clean",
      route: [
        { route_type: "wire", x: -5, y: -3, layer: "top", width: 0.15 },
        { route_type: "wire", x: 5, y: -3, layer: "top", width: 0.15 },
      ],
    },
    {
      // Sibling trace containing a through_obstacle. Used to crash
      // the whole renderer.
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_with_throughobstacle",
      source_trace_id: "source_trace_through",
      route: [
        { route_type: "wire", x: -5, y: 3, layer: "top", width: 0.15 },
        {
          route_type: "through_obstacle",
          start: { x: -5, y: 3 },
          end: { x: -5, y: 3 },
          from_layer: "top",
          to_layer: "bottom",
          width: 0.15,
        },
        { route_type: "wire", x: 5, y: 3, layer: "bottom", width: 0.15 },
      ],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  // Clean wire trace emits its segment path.
  expect(svg.match(/data-type="pcb_trace"/g)?.length).toBeGreaterThan(0)
})
