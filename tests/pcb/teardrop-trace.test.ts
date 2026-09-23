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
  expect(svg.match(/data-route-type="teardrop"/g)?.length).toBe(6)
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
      'data-route-type="teardrop"',
    )
    expect(convertCircuitJsonToPcbSvg(input, { layer: "top" })).not.toContain(
      'data-route-type="teardrop"',
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
  expect(svg).toContain('data-route-type="teardrop"')
  expect(svg).toContain('data-type="pcb_trace_soldermask"')
})
