import type {
  AnyCircuitElement,
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { createPcbTraceStroke } from "./create-pcb-trace-stroke"

/** Overlay strokes are drawn 10% wider than the copper, as KiCad does (diff_phase_skew_tool.cpp), so the colour fully covers the trace edges. */
const PHASE_SKEW_STROKE_WIDTH_MULTIPLIER = 1.1
const FULL_RGB_PERCENT = 100
const ZERO_COLOR = "rgb(255, 255, 255)"
const POSITIVE_PEAK_COLOR = "rgb(0, 0, 255)"
const NEGATIVE_PEAK_COLOR = "rgb(255, 0, 0)"

interface PhaseSkewPeaks {
  positivePeakMm: number
  negativePeakMm: number
}

interface PhaseSkewSvgObjects {
  strokes: SvgObject[]
  defs?: SvgObject
}

/** Draw stored phase skew segments above their layer's copper. */
export function createSvgObjectsFromDifferentialPairPhaseSkew({
  circuitJson,
  ctx: { layer, transform },
}: {
  circuitJson: AnyCircuitElement[]
  ctx: Pick<PcbContext, "layer" | "transform">
}): PhaseSkewSvgObjects {
  const strokes: SvgObject[] = []
  const gradients: SvgObject[] = []

  for (const element of circuitJson) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue

    for (const trace of [element.positive_trace, element.negative_trace]) {
      const peaks = getPhaseSkewPeaks({ trace })
      for (const segment of trace.segments) {
        if (layer && segment.layer !== layer) continue

        const startColor = getPhaseSkewColor({
          lengthDifferenceMm: segment.start_length_difference_mm,
          peaks,
        })
        const endColor = getPhaseSkewColor({
          lengthDifferenceMm: segment.end_length_difference_mm,
          peaks,
        })
        let color = startColor
        if (startColor !== endColor) {
          const id = `pcb-phase-skew-gradient-${gradients.length}`
          gradients.push(
            createPhaseSkewGradient({
              id,
              segment,
              transform,
              startColor,
              endColor,
            }),
          )
          color = `url(#${id})`
        }

        strokes.push(
          createPcbTraceStroke(
            {
              ...segment,
              width: segment.width * PHASE_SKEW_STROKE_WIDTH_MULTIPLIER,
            },
            transform,
            {
              color,
              className: "pcb-differential-pair-phase-skew",
              dataType: element.type,
              shapeRendering: "geometricPrecision",
            },
          ),
        )
      }
    }
  }

  if (gradients.length === 0) return { strokes }
  return {
    strokes,
    defs: {
      name: "defs",
      type: "element",
      value: "",
      attributes: {},
      children: gradients,
    },
  }
}

/** Find the endpoints that set the positive and negative scales for a trace. */
function getPhaseSkewPeaks({
  trace,
}: {
  trace: PcbDifferentialPairPhaseSkewTrace
}): PhaseSkewPeaks {
  let positivePeakMm = 0
  let negativePeakMm = 0
  for (const {
    start_length_difference_mm,
    end_length_difference_mm,
  } of trace.segments) {
    positivePeakMm = Math.max(
      positivePeakMm,
      start_length_difference_mm,
      end_length_difference_mm,
    )
    negativePeakMm = Math.min(
      negativePeakMm,
      start_length_difference_mm,
      end_length_difference_mm,
    )
  }
  return { positivePeakMm, negativePeakMm }
}

/** Interpolate from white to blue or red against this trace's peak of the same sign. */
function getPhaseSkewColor({
  lengthDifferenceMm,
  peaks: { positivePeakMm, negativePeakMm },
}: {
  lengthDifferenceMm: number
  peaks: PhaseSkewPeaks
}): string {
  if (lengthDifferenceMm === 0) return ZERO_COLOR
  const isAhead = lengthDifferenceMm > 0
  const peakMm = isAhead ? positivePeakMm : negativePeakMm
  if (lengthDifferenceMm === peakMm) {
    return isAhead ? POSITIVE_PEAK_COLOR : NEGATIVE_PEAK_COLOR
  }
  // SVG 1.1 rgb() accepts fractional channels in percentage form.
  const fade = FULL_RGB_PERCENT * (1 - lengthDifferenceMm / peakMm)
  return isAhead
    ? `rgb(${fade}%, ${fade}%, 100%)`
    : `rgb(100%, ${fade}%, ${fade}%)`
}

/** Create an sRGB gradient aligned with the segment in SVG coordinates. */
function createPhaseSkewGradient({
  id,
  segment: { start, end },
  transform,
  startColor,
  endColor,
}: {
  id: string
  segment: PcbDifferentialPairPhaseSkewSegment
  transform: Matrix
  startColor: string
  endColor: string
}): SvgObject {
  const svgStart = applyToPoint(transform, start)
  const svgEnd = applyToPoint(transform, end)
  return {
    name: "linearGradient",
    type: "element",
    value: "",
    attributes: {
      id,
      gradientUnits: "userSpaceOnUse",
      x1: String(svgStart.x),
      y1: String(svgStart.y),
      x2: String(svgEnd.x),
      y2: String(svgEnd.y),
    },
    children: [startColor, endColor].map((color, offset) => ({
      name: "stop",
      type: "element",
      value: "",
      attributes: { offset: String(offset), "stop-color": color },
      children: [],
    })),
  }
}
