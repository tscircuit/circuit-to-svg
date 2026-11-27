import { Resvg } from "@resvg/resvg-js"
import { expect, expectTypeOf, test } from "bun:test"
import type { PcbDifferentialPairPhaseSkewSegment } from "circuit-json"
import { convertCircuitJsonToPcbSvg, type PcbSvgOptions } from "lib"
import {
  getPhaseSkewColor,
  splitPhaseSkewSegmentAtFullScale,
} from "lib/pcb/svg-object-fns/create-svg-objects-from-differential-pair-phase-skew"
import {
  renderDifferentialPair,
  renderPhaseSkewSvg,
} from "./phase-skew/differential-pair.fixture"
import {
  readRgb,
  renderPhaseSkewRoute,
  wire,
} from "./phase-skew/joints.fixture"

test("splits a 0 to 2 mm skew segment at the 1 mm midpoint", () => {
  const segment = {
    start: { x: -1, y: -2 },
    end: { x: 1, y: 2 },
    layer: "top",
    width: 0.4,
    start_length_difference_mm: 0,
    end_length_difference_mm: 2,
  } satisfies PcbDifferentialPairPhaseSkewSegment

  const midpoint = { x: 0, y: 0 }
  expect(splitPhaseSkewSegmentAtFullScale({ segment, fullScaleMm: 1 })).toEqual(
    [
      { ...segment, end: midpoint, end_length_difference_mm: 1 },
      { ...segment, start: midpoint, start_length_difference_mm: 1 },
    ],
  )
  expect(getPhaseSkewColor({ lengthDifferenceMm: 1, fullScaleMm: 1 })).toBe(
    "rgb(0, 0, 255)",
  )
  expect(getPhaseSkewColor({ lengthDifferenceMm: 2, fullScaleMm: 1 })).toBe(
    "rgb(0, 0, 255)",
  )

  const fallingMagnitude = {
    ...segment,
    start_length_difference_mm: -2,
    end_length_difference_mm: 0,
  }
  expect(
    splitPhaseSkewSegmentAtFullScale({
      segment: fallingMagnitude,
      fullScaleMm: 1,
    }),
  ).toEqual([
    { ...fallingMagnitude, end: midpoint, end_length_difference_mm: -1 },
    { ...fallingMagnitude, start: midpoint, start_length_difference_mm: -1 },
  ])
  for (const fullScaleMm of [0, 2, 3]) {
    expect(splitPhaseSkewSegmentAtFullScale({ segment, fullScaleMm })).toEqual([
      segment,
    ])
  }
})

test("uses full color for any nonzero skew at zero full scale", () => {
  expect(
    getPhaseSkewColor({ lengthDifferenceMm: Number.MIN_VALUE, fullScaleMm: 0 }),
  ).toBe("rgb(0, 0, 255)")
  expect(
    getPhaseSkewColor({
      lengthDifferenceMm: -Number.MIN_VALUE,
      fullScaleMm: 0,
    }),
  ).toBe("rgb(255, 0, 0)")
  expect(getPhaseSkewColor({ lengthDifferenceMm: 0, fullScaleMm: 0 })).toBe(
    "rgb(255, 255, 255)",
  )
})

test("overrides the positive, negative and zero colors", () => {
  const options = {
    fullScaleMm: 1,
    colors: { positive: "#f00", negative: "#0f0", zero: "#00f" },
  }
  for (const [lengthDifferenceMm, color] of [
    [1, "#f00"],
    [-1, "#0f0"],
    [0, "#00f"],
    [0.5, "rgb(50%, 0%, 50%)"],
    [-0.5, "rgb(0%, 50%, 50%)"],
  ] as const) {
    expect(getPhaseSkewColor({ lengthDifferenceMm, ...options })).toBe(color)
  }
})

test.each([-1, NaN, Infinity, undefined, "2"])(
  "rejects an invalid phase skew full scale (%s)",
  (phaseSkewFullScaleMm) => {
    expect(() =>
      convertCircuitJsonToPcbSvg([], {
        showDifferentialPairPhaseSkew: true,
        phaseSkewFullScaleMm: phaseSkewFullScaleMm as number,
      }),
    ).toThrow("phaseSkewFullScaleMm")
  },
)

test.each([-1, NaN, Infinity, "2"])(
  "rejects an invalid per-pair scale (%s) even when the pair is absent",
  (scale) => {
    expect(() =>
      convertCircuitJsonToPcbSvg([], {
        showDifferentialPairPhaseSkew: true,
        phaseSkewFullScaleMm: 2,
        phaseSkewFullScaleMmBySourceBusId: { missing_pair: scale as number },
      }),
    ).toThrow('phaseSkewFullScaleMmBySourceBusId["missing_pair"]')
  },
)

test("requires full scale in the public options when the overlay is enabled", () => {
  expectTypeOf<{
    showDifferentialPairPhaseSkew: boolean
    phaseSkewFullScaleMm: number
  }>().toExtend<PcbSvgOptions>()
  type MissingFullScale = { showDifferentialPairPhaseSkew: true }
  // @ts-expect-error An enabled overlay requires phaseSkewFullScaleMm.
  expectTypeOf<MissingFullScale>().toExtend<PcbSvgOptions>()
})

test("renders a gradient that reaches full color halfway along the trace", async () => {
  const route = [wire({ x: -1.5, y: 0 }), wire({ x: 1.5, y: 0 })]
  const { svg } = await renderPhaseSkewRoute({
    route,
    options: { phaseSkewFullScaleMm: 0.5 },
  })
  const image = new Resvg(svg).render()
  const ramp = readRgb({ image, x: 125, y: 200 })
  expect(ramp[0]).toBeGreaterThan(0)
  expect(readRgb({ image, x: 200, y: 200 })).toEqual([0, 0, 255])
  expect(readRgb({ image, x: 275, y: 200 })).toEqual([0, 0, 255])

  const zeroScale = await renderPhaseSkewRoute({
    route,
    options: {
      phaseSkewFullScaleMm: 0,
      phaseSkewColors: { positive: "#00ff80" },
    },
  })
  expect(
    readRgb({ image: new Resvg(zeroScale.svg).render(), x: 75, y: 200 }),
  ).toEqual([0, 255, 128])
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("uses a per-pair full scale and the fallback on the same board", async () => {
  const circuitJson = await renderDifferentialPair({ pairYPositions: [2, -2] })
  const pairs = circuitJson.filter(
    (element) => element.type === "pcb_differential_pair_phase_skew",
  )
  expect(pairs).toHaveLength(2)

  // Give both TSX-generated pairs the same skew to isolate color scaling.
  for (const { positive_trace, negative_trace } of pairs) {
    for (const [index, trace] of [positive_trace, negative_trace].entries()) {
      const skewMm = index === 0 ? 1 : -1
      for (const segment of trace.segments) {
        segment.start_length_difference_mm = skewMm
        segment.end_length_difference_mm = skewMm
      }
    }
  }

  const svg = renderPhaseSkewSvg(circuitJson, {
    width: 840,
    height: 240,
    drawPaddingOutsideBoard: false,
    phaseSkewFullScaleMm: 2,
    phaseSkewFullScaleMmBySourceBusId: { [pairs[0]!.source_bus_id]: 1 },
  })
  const image = new Resvg(svg).render()
  expect(readRgb({ image, x: 420, y: 42 })).toEqual([0, 0, 255])
  expect(readRgb({ image, x: 420, y: 78 })).toEqual([255, 0, 0])
  expect(readRgb({ image, x: 420, y: 162 })).toEqual([128, 128, 255])
  expect(readRgb({ image, x: 420, y: 198 })).toEqual([255, 128, 128])
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "phase-skew-per-pair-full-scale",
  )
})
