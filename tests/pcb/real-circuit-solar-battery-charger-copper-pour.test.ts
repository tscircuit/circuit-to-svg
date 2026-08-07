import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbTrace } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import solarBatteryChargerPcbJson from "./assets/shibosoftwaredev-solar-battery-charger-1.0.2-pcb.json"

// PCB-only subset of
// https://tscircuit.com/ShiboSoftwareDev/solar-battery-charger@1.0.2
// (release 180c3e01-9b88-49c7-a991-393f0fc45e53). It was copied from the
// published dist/index/circuit.json artifact with only non-PCB elements removed.
const solarBatteryChargerPcb = solarBatteryChargerPcbJson as AnyCircuitElement[]
const traces = solarBatteryChargerPcb.filter(
  (element): element is PcbTrace => element.type === "pcb_trace",
)

const markedRoutePointCount = traces.reduce(
  (count, trace) =>
    count +
    trace.route.filter(
      (point) =>
        "is_inside_copper_pour" in point &&
        point.is_inside_copper_pour === true,
    ).length,
  0,
)

const copperPourTransitionCount = traces.reduce((count, trace) => {
  let traceTransitionCount = 0

  for (let index = 0; index < trace.route.length - 1; index++) {
    const start = trace.route[index]
    const end = trace.route[index + 1]
    if (start?.route_type !== "wire" || end?.route_type !== "wire") continue
    if (start.x === end.x && start.y === end.y) continue

    const startIsInside = start.is_inside_copper_pour === true
    const endIsInside = end.is_inside_copper_pour === true
    if (startIsInside !== endIsInside) traceTransitionCount++
  }

  return count + traceTransitionCount
}, 0)

test("reproduces trace overlap at copper-pour entries on a real circuit", () => {
  expect(traces).toHaveLength(103)
  expect(markedRoutePointCount).toBe(257)
  expect(copperPourTransitionCount).toBe(12)

  const svg = convertCircuitJsonToPcbSvg(solarBatteryChargerPcb, {
    layer: "top",
    width: 800,
    matchBoardAspectRatio: true,
    drawPaddingOutsideBoard: false,
    includeVersion: false,
  })

  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "real-circuit-solar-battery-charger-top-layer",
  )
})

test("reproduces a real trace continuing past the pour boundary", () => {
  const svg = convertCircuitJsonToPcbSvg(solarBatteryChargerPcb, {
    layer: "top",
    width: 800,
    height: 600,
    drawPaddingOutsideBoard: false,
    includeVersion: false,
    viewport: {
      minX: -10.8,
      minY: 1.8,
      maxX: -8.9,
      maxY: 3.5,
    },
  })

  // This is a crop of the unmodified real circuit. The trace entering the
  // large ground pour is intentionally still visible beyond its boundary.
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "real-circuit-solar-battery-charger-copper-pour-entry-detail",
  )
})
