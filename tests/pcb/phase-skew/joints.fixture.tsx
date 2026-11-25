import { Resvg, type RenderedImage } from "@resvg/resvg-js"
import { Circuit } from "@tscircuit/core"
import { expect } from "bun:test"
import type {
  PcbDifferentialPairPhaseSkew,
  PcbTrace,
  Point,
} from "circuit-json"
import type { PcbSvgOptions } from "lib"
import { getPcbTraceSegments } from "lib/pcb/get-pcb-trace-segments"
import { parseSync } from "svgson"
import {
  isPhaseSkewStroke,
  renderPhaseSkewSvg,
} from "./differential-pair.fixture"

type WirePoint = Extract<PcbTrace["route"][number], { route_type: "wire" }>

const BOARD_SIZE_MM = 4
const PIXELS_PER_MM = 100
const IMAGE_SIZE = BOARD_SIZE_MM * PIXELS_PER_MM
const COPPER_RGB = [0, 255, 0] as const
const JOINT_COLOR_TOLERANCE = 2
const ROUTE_OPTIONS = {
  width: IMAGE_SIZE,
  height: IMAGE_SIZE,
  drawPaddingOutsideBoard: false,
  colorOverrides: { copper: { top: "#00ff00" } },
} satisfies PcbSvgOptions

export function wire({
  x,
  y,
  width = 0.4,
  layer = "top",
}: Pick<WirePoint, "x" | "y"> &
  Partial<Pick<WirePoint, "width" | "layer">>): WirePoint {
  return { route_type: "wire", x, y, width, layer }
}

export async function renderPhaseSkewRoute({
  route,
  secondStartJitterMm = 0,
}: {
  route: PcbTrace["route"]
  secondStartJitterMm?: number
}) {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(
    <board width={BOARD_SIZE_MM} height={BOARD_SIZE_MM} routeRemaining={false}>
      <chip
        name="U1"
        footprint={
          <footprint>
            <pcbtrace route={route} />
          </footprint>
        }
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const trace = circuitJson.find((element) => element.type === "pcb_trace")
  if (!trace) throw new Error("Core did not render the fixture trace")

  // Seed a continuous ramp over the copper Core rendered. This fixture tests
  // the SVG renderer independently of the solver's coupling heuristics.
  const segments = getPcbTraceSegments(trace.route)
  const skew: PcbDifferentialPairPhaseSkew = {
    type: "pcb_differential_pair_phase_skew",
    pcb_differential_pair_phase_skew_id: "fixture_skew",
    source_bus_id: "fixture_pair",
    positive_trace: {
      pcb_trace_id: trace.pcb_trace_id,
      segments: segments.map(({ start, end, width, layer }, index) => ({
        start:
          index === 1
            ? { x: start.x + secondStartJitterMm, y: start.y }
            : start,
        end,
        width,
        layer,
        start_length_difference_mm: index / segments.length,
        end_length_difference_mm: (index + 1) / segments.length,
      })),
    },
    negative_trace: { pcb_trace_id: "fixture_unused_trace", segments: [] },
  }

  const svg = renderPhaseSkewSvg([...circuitJson, skew], ROUTE_OPTIONS)
  const copper = renderPhaseSkewSvg(circuitJson, ROUTE_OPTIONS)
  const overlay = parseSync(svg).children.filter(isPhaseSkewStroke)
  return { svg, copper, overlay }
}

export function readRgb({ image, x, y }: { image: RenderedImage } & Point) {
  const offset = (y * image.width + x) * 4
  const [red, green, blue] = image.pixels.subarray(offset, offset + 3)
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`No pixel at ${x}, ${y}`)
  }
  return [red, green, blue] as const
}

export function expectJointCoverage({
  svg,
  copper,
  sample,
  expectedChannel,
}: {
  svg: string
  copper: string
  sample: Point
  expectedChannel: number
}) {
  expect(readRgb({ image: new Resvg(copper).render(), ...sample })).toEqual(
    COPPER_RGB,
  )
  const [red, green, blue] = readRgb({
    image: new Resvg(svg).render(),
    ...sample,
  })
  expect(Math.abs(red - expectedChannel)).toBeLessThanOrEqual(
    JOINT_COLOR_TOLERANCE,
  )
  expect(green).toBe(red)
  expect(blue).toBe(255)
}
