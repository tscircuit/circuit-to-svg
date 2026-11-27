import { expect, test } from "bun:test"
import type {
  PcbDifferentialPairPhaseSkewSegment,
  SourceBus,
} from "circuit-json"
import {
  DEFAULT_PHASE_SKEW_FULL_SCALE_MM,
  getPhaseSkewColor,
  getPhaseSkewFullScaleMmBySourceBusId,
  splitPhaseSkewSegmentAtFullScale,
} from "lib/pcb/svg-object-fns/create-svg-objects-from-differential-pair-phase-skew"
import { parseSync } from "svgson"
import {
  isPhaseSkewStroke,
  renderDifferentialPair,
  renderPhaseSkewSvg,
  TUNING_BUMP,
} from "./phase-skew/differential-pair.fixture"

test("phase skew splits a 0 to 2 mm segment at the 1 mm limit", () => {
  const segment = {
    start: { x: 0, y: 0 },
    end: { x: 4, y: 2 },
    start_length_difference_mm: 0,
    end_length_difference_mm: 2,
    layer: "top",
    width: 0.2,
  } satisfies PcbDifferentialPairPhaseSkewSegment
  const fullScaleMm = 1
  const [ramp, saturated] = splitPhaseSkewSegmentAtFullScale({
    segment,
    fullScaleMm,
  })
  expect(ramp).toEqual({
    ...segment,
    end: { x: 2, y: 1 },
    end_length_difference_mm: 1,
  })
  expect(saturated).toEqual({
    ...segment,
    start: { x: 2, y: 1 },
    start_length_difference_mm: 1,
  })
  for (const lengthDifferenceMm of [
    saturated!.start_length_difference_mm,
    saturated!.end_length_difference_mm,
  ]) {
    expect(getPhaseSkewColor({ lengthDifferenceMm, fullScaleMm })).toBe(
      "rgb(0, 0, 255)",
    )
  }
})

test("phase skew uses the 2 mm fallback for a missing bus or limit", async () => {
  expect(DEFAULT_PHASE_SKEW_FULL_SCALE_MM).toBe(2)
  const circuitJson = await renderDifferentialPair({
    positivePath: TUNING_BUMP,
    maxLengthSkew: 2,
  })
  expect(
    getPhaseSkewFullScaleMmBySourceBusId({ elements: circuitJson }),
  ).toEqual(
    expect.objectContaining({
      [circuitJson.find((element) => element.type === "source_bus")!
        .source_bus_id]: 2,
    }),
  )
  const expectedSvg = renderPhaseSkewSvg(circuitJson)
  expect(expectedSvg).toContain("linearGradient")
  const noBus = circuitJson.filter((element) => element.type !== "source_bus")
  const noLimit = circuitJson.map((element) =>
    element.type === "source_bus"
      ? { ...element, max_length_skew: undefined }
      : element,
  )
  expect(renderPhaseSkewSvg(noBus)).toBe(expectedSvg)
  expect(renderPhaseSkewSvg(noLimit)).toBe(expectedSvg)
})

test("a zero limit makes any nonzero skew fully saturated", async () => {
  const fullScaleMm = 0
  expect(getPhaseSkewColor({ lengthDifferenceMm: 0, fullScaleMm })).toBe(
    "rgb(255, 255, 255)",
  )
  expect(getPhaseSkewColor({ lengthDifferenceMm: 0.001, fullScaleMm })).toBe(
    "rgb(0, 0, 255)",
  )
  expect(getPhaseSkewColor({ lengthDifferenceMm: -0.001, fullScaleMm })).toBe(
    "rgb(255, 0, 0)",
  )

  const circuitJson = await renderDifferentialPair({
    positivePath: TUNING_BUMP,
    maxLengthSkew: fullScaleMm,
  })
  const svg = renderPhaseSkewSvg(circuitJson)
  expect(svg).not.toContain("pcb-phase-skew-gradient")
  const paints = parseSync(svg)
    .children.filter(isPhaseSkewStroke)
    .filter(({ name }) => name === "path")
    .map(({ attributes }) => attributes.stroke)
  expect(new Set(paints)).toEqual(
    new Set(["rgb(0, 0, 255)", "rgb(255, 0, 0)", "rgb(255, 255, 255)"]),
  )
})

test("phaseSkewColors overrides the palette for a pair with a skew limit", async () => {
  const circuitJson = await renderDifferentialPair({
    positivePath: TUNING_BUMP,
    maxLengthSkew: 0.25,
  })
  const phaseSkewColors = {
    positive: "#00ee44",
    negative: "#ff8800",
    zero: "#dddddd",
  }
  const svg = renderPhaseSkewSvg(circuitJson, { phaseSkewColors })
  const paints = parseSync(svg)
    .children.filter(isPhaseSkewStroke)
    .filter(({ name }) => name === "path")
    .map(({ attributes }) => attributes.stroke)
  for (const color of Object.values(phaseSkewColors)) {
    expect(paints).toContain(color)
  }
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "phase-skew-custom-colors",
  )
})

test("the phase skew scale map contains only source buses with a limit", () => {
  const bus = {
    type: "source_bus",
    source_bus_id: "unlimited",
    source_trace_ids: [],
  } satisfies SourceBus
  const elements = [
    bus,
    { ...bus, source_bus_id: "limited", max_length_skew: 1 },
    { ...bus, source_bus_id: "exact", max_length_skew: 0 },
  ]
  expect(getPhaseSkewFullScaleMmBySourceBusId({ elements })).toEqual({
    limited: 1,
    exact: 0,
  })
})
