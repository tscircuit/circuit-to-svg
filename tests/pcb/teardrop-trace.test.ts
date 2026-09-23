import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "../../lib"
import { teardropDemo } from "../fixtures/teardrop-demo"
import { getComprehensivePcbBounds } from "../../lib/pcb/get-pcb-bounds-from-circuit-json"
import { getPcbTraceSegments } from "../../lib/pcb/get-pcb-trace-segments"
import type { PcbTrace } from "circuit-json"

test("teardrop profiles join pads, wires and vias on multiple layers", () => {
  const svg = convertCircuitJsonToPcbSvg(teardropDemo, {
    width: 720,
    height: 600,
  })
  expect(svg.match(/data-wire-taper="true"/g)?.length).toBe(6)
  expect(svg).not.toMatch(/NaN|Infinity/)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
test("single taper is bounded by its copper and obeys layer filters", () => {
  const trace = teardropDemo.find(
    (e) => e.type === "pcb_trace" && e.pcb_trace_id === "inner",
  ) as PcbTrace
  const bounds = getComprehensivePcbBounds([trace])
  expect(bounds.minY).toBe(-7)
  expect(bounds.maxY).toBe(-5)
  for (const mode of ["constant", "interpolated"] as const) {
    const input = [{ ...trace, route_thickness_mode: mode }]
    expect(convertCircuitJsonToPcbSvg(input, { layer: "inner1" })).toContain(
      'data-wire-taper="true"',
    )
    expect(convertCircuitJsonToPcbSvg(input, { layer: "top" })).not.toContain(
      'data-wire-taper="true"',
    )
  }
})
test("teardrops do not produce implicit bridging segments", () => {
  const trace = teardropDemo.find(
    (e) => e.type === "pcb_trace" && e.pcb_trace_id === "linear",
  ) as PcbTrace
  const segments = getPcbTraceSegments(trace.route)
  expect(segments.length).toBe(1)
  expect(segments[0]?.start.x).toBe(-2)
  expect(segments[0]?.end.x).toBe(6)
})
test("soldermask follows the taper", () => {
  const svg = convertCircuitJsonToPcbSvg(teardropDemo, {
    layer: "top",
    showSolderMask: true,
  })
  expect(svg).toContain('data-wire-taper="true"')
  expect(svg).toContain('data-type="pcb_trace_soldermask"')
})

test("ordinary segments before and after a taper are preserved without a duplicate stroke", () => {
  const tapered = {
    route_type: "wire" as const,
    x: 0,
    y: 0,
    width: 0.6,
    layer: "top" as const,
    start_width: 0.6,
    end_width: 0.2,
    width_interpolation_mode: "quadratic" as const,
  }
  const route: PcbTrace["route"] = [
    { route_type: "wire", x: -1, y: 0, width: 0.6, layer: "top" },
    tapered,
    { route_type: "wire", x: 1, y: 0, width: 0.2, layer: "top" },
    { route_type: "wire", x: 2, y: 0, width: 0.2, layer: "top" },
  ]
  expect(getPcbTraceSegments(route).map((s) => [s.start.x, s.end.x])).toEqual([
    [-1, 0],
    [1, 2],
  ])
})
