import type {
  AnyCircuitElement,
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
} from "circuit-json"
import { svgElement } from "lib/sim/simulation-graph-svg/simulation-graph-svg-shared"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { createPcbTraceStroke } from "./create-pcb-trace-stroke"
import {
  addPhaseSkewGradient,
  createPhaseSkewRun,
} from "./create-phase-skew-run"

/** Overlay strokes are drawn 10% wider than the copper, as KiCad does (diff_phase_skew_tool.cpp), so the colour fully covers the trace edges. */
const PHASE_SKEW_STROKE_WIDTH_MULTIPLIER = 1.1
const FALLBACK_STROKE_WIDTH_SVG_PX = 0.3
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
  const defs: SvgObject[] = []

  for (const element of circuitJson) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue

    for (const trace of [element.positive_trace, element.negative_trace]) {
      const peaks = getPhaseSkewPeaks(trace)
      const getSpan = (segment: PcbDifferentialPairPhaseSkewSegment) => ({
        start: applyToPoint(transform, segment.start),
        end: applyToPoint(transform, segment.end),
        radius:
          (segment.width *
            PHASE_SKEW_STROKE_WIDTH_MULTIPLIER *
            Math.abs(transform.a) || FALLBACK_STROKE_WIDTH_SVG_PX) / 2,
        startColor: getPhaseSkewColor({
          lengthDifferenceMm: segment.start_length_difference_mm,
          peaks,
        }),
        endColor: getPhaseSkewColor({
          lengthDifferenceMm: segment.end_length_difference_mm,
          peaks,
        }),
      })
      for (const [first, ...rest] of getPhaseSkewRuns(trace.segments)) {
        if (layer && first.layer !== layer) continue

        const span = getSpan(first)
        if (rest.length > 0) {
          strokes.push(
            createPhaseSkewRun(
              [span, ...rest.map(getSpan)],
              {
                class: "pcb-differential-pair-phase-skew",
                "data-type": element.type,
                "data-pcb-layer": first.layer,
              },
              defs,
            ),
          )
          continue
        }

        const color =
          span.startColor === span.endColor
            ? span.startColor
            : addPhaseSkewGradient(span.start, span.end, span, defs)
        strokes.push(
          createPcbTraceStroke(
            {
              ...first,
              width: first.width * PHASE_SKEW_STROKE_WIDTH_MULTIPLIER,
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

  if (defs.length === 0) return { strokes }
  return {
    strokes,
    defs: svgElement("defs", {}, defs),
  }
}

function* getPhaseSkewRuns([
  first,
  ...rest
]: PcbDifferentialPairPhaseSkewTrace["segments"]) {
  if (first === undefined) return

  let run: [
    PcbDifferentialPairPhaseSkewSegment,
    ...PcbDifferentialPairPhaseSkewTrace["segments"],
  ] = [first]
  let previous = first
  for (const segment of rest) {
    if (!canJoinPhaseSkewSegments(previous, segment)) {
      yield run
      run = [segment]
    } else {
      run.push(segment)
    }
    previous = segment
  }
  yield run
}

function canJoinPhaseSkewSegments(
  previous: PcbDifferentialPairPhaseSkewSegment,
  segment: PcbDifferentialPairPhaseSkewSegment,
): boolean {
  if (
    previous.layer !== segment.layer ||
    previous.end.x !== segment.start.x ||
    previous.end.y !== segment.start.y
  )
    return false

  const incomingX = previous.end.x - previous.start.x
  const incomingY = previous.end.y - previous.start.y
  const outgoingX = segment.end.x - segment.start.x
  const outgoingY = segment.end.y - segment.start.y
  const incomingLength = Math.hypot(incomingX, incomingY)
  const outgoingLength = Math.hypot(outgoingX, outgoingY)
  const dot = incomingX * outgoingX + incomingY * outgoingY
  // A zero-length span or reversal has no shared cross-section.
  return dot / (incomingLength * outgoingLength) > -1 + Number.EPSILON
}

/** Find the endpoints that set the positive and negative scales for a trace. */
function getPhaseSkewPeaks({
  segments,
}: PcbDifferentialPairPhaseSkewTrace): PhaseSkewPeaks {
  let positivePeakMm = 0
  let negativePeakMm = 0
  for (const {
    start_length_difference_mm: startDifference,
    end_length_difference_mm: endDifference,
  } of segments) {
    positivePeakMm = Math.max(positivePeakMm, startDifference, endDifference)
    negativePeakMm = Math.min(negativePeakMm, startDifference, endDifference)
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
