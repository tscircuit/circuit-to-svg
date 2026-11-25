import type {
  AnyCircuitElement,
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
  Point,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import {
  createPcbTraceStroke,
  getPcbTraceStrokeWidth,
} from "./create-pcb-trace-stroke"

/** Overlay strokes are drawn 10% wider than the copper, as KiCad does (diff_phase_skew_tool.cpp), so the colour fully covers the trace edges. */
const PHASE_SKEW_STROKE_WIDTH_MULTIPLIER = 1.1
const JOINT_TOLERANCE_MM = 1e-6
const PHASE_SKEW_CLASS = "pcb-differential-pair-phase-skew"
const PHASE_SKEW_TYPE = "pcb_differential_pair_phase_skew"
const FNV_OFFSET_BASIS = 0xcbf29ce484222325n
const FNV_PRIME = 0x100000001b3n
const HASH_BITS = 64
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
  phaseSkewIdPrefix = "",
}: {
  circuitJson: AnyCircuitElement[]
  ctx: Pick<PcbContext, "layer" | "transform">
  phaseSkewIdPrefix?: string
}): PhaseSkewSvgObjects {
  const fills: SvgObject[] = []
  const strokes: SvgObject[] = []
  const gradients: SvgObject[] = []

  for (const element of circuitJson) {
    if (element.type !== PHASE_SKEW_TYPE) continue

    for (const polarity of ["positive_trace", "negative_trace"] as const) {
      const trace = element[polarity]
      const peaks = getPhaseSkewPeaks(trace)
      for (const [index, segment] of trace.segments.entries()) {
        if (layer && segment.layer !== layer) continue

        const previous = trace.segments[index - 1]
        const next = trace.segments[index + 1]
        const joinsPrevious =
          previous !== undefined && canJoinSegments({ previous, next: segment })
        const joinsNext =
          next !== undefined && canJoinSegments({ previous: segment, next })
        const isInRun = joinsPrevious || joinsNext
        const start = joinsPrevious ? previous.end : segment.start
        const { end } = segment
        const svgStart = applyToPoint(transform, start)
        const svgEnd = applyToPoint(transform, end)
        const width = segment.width * PHASE_SKEW_STROKE_WIDTH_MULTIPLIER

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
          const { id, gradient } = createPhaseSkewGradient({
            identity: [
              phaseSkewIdPrefix,
              element.pcb_differential_pair_phase_skew_id,
              polarity,
              trace.pcb_trace_id,
              index,
            ],
            svgStart,
            svgEnd,
            startColor,
            endColor,
          })
          gradients.push(gradient)
          color = `url(#${id})`
        }

        if (isInRun) {
          const strokeWidth = getPcbTraceStrokeWidth({ width, transform })
          const jointWidth = joinsPrevious
            ? Math.max(
                strokeWidth,
                getPcbTraceStrokeWidth({
                  width: previous.width * PHASE_SKEW_STROKE_WIDTH_MULTIPLIER,
                  transform,
                }),
              )
            : strokeWidth

          // SVG uses one cap style for both ends. Circles under the butt strokes
          // supply the round run ends and fill the outside of each bend.
          fills.push(
            createPhaseSkewDisc({
              center: svgStart,
              radius: jointWidth / 2,
              color: startColor,
              layer: segment.layer,
            }),
          )
          if (!joinsNext)
            fills.push(
              createPhaseSkewDisc({
                center: svgEnd,
                radius: strokeWidth / 2,
                color: endColor,
                layer: segment.layer,
              }),
            )
        }

        strokes.push(
          createPcbTraceStroke(
            { ...segment, start, width },
            transform,
            {
              color,
              className: PHASE_SKEW_CLASS,
              dataType: PHASE_SKEW_TYPE,
              shapeRendering: "geometricPrecision",
            },
            { "stroke-linecap": isInRun ? "butt" : "round" },
          ),
        )
      }
    }
  }

  const overlay = [...fills, ...strokes]
  if (gradients.length === 0) return { strokes: overlay }
  return {
    strokes: overlay,
    defs: createPhaseSkewElement({
      name: "defs",
      attributes: {},
      children: gradients,
    }),
  }
}

function canJoinSegments({
  previous,
  next,
}: {
  previous: PcbDifferentialPairPhaseSkewSegment
  next: PcbDifferentialPairPhaseSkewSegment
}): boolean {
  return (
    previous.layer === next.layer &&
    Math.hypot(previous.end.x - next.start.x, previous.end.y - next.start.y) <=
      JOINT_TOLERANCE_MM
  )
}

function createPhaseSkewDisc({
  center,
  radius,
  color,
  layer,
}: {
  center: Point
  radius: number
  color: string
  layer: PcbDifferentialPairPhaseSkewSegment["layer"]
}): SvgObject {
  return createPhaseSkewElement({
    name: "circle",
    attributes: {
      class: PHASE_SKEW_CLASS,
      "data-type": PHASE_SKEW_TYPE,
      "data-pcb-layer": layer,
      cx: String(center.x),
      cy: String(center.y),
      r: String(radius),
      fill: color,
    },
  })
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

/** Create an sRGB gradient aligned with the segment in SVG coordinates. */
function createPhaseSkewGradient({
  identity,
  svgStart,
  svgEnd,
  startColor,
  endColor,
}: {
  identity: (string | number)[]
  svgStart: Point
  svgEnd: Point
  startColor: string
  endColor: string
}): { id: string; gradient: SvgObject } {
  // Circuit JSON IDs are local to a board. Include the rendered paint so
  // independent SVGs with the same trace IDs can be inlined together.
  const gradientKey = JSON.stringify([
    identity,
    svgStart,
    svgEnd,
    startColor,
    endColor,
  ])
  let hash = FNV_OFFSET_BASIS
  for (let index = 0; index < gradientKey.length; index++) {
    hash = BigInt.asUintN(
      HASH_BITS,
      (hash ^ BigInt(gradientKey.charCodeAt(index))) * FNV_PRIME,
    )
  }
  const id = `pcb-phase-skew-gradient-${hash.toString(16)}`
  return {
    id,
    gradient: createPhaseSkewElement({
      name: "linearGradient",
      attributes: {
        id,
        gradientUnits: "userSpaceOnUse",
        x1: String(svgStart.x),
        y1: String(svgStart.y),
        x2: String(svgEnd.x),
        y2: String(svgEnd.y),
      },
      children: [startColor, endColor].map((color, offset) =>
        createPhaseSkewElement({
          name: "stop",
          attributes: { offset: String(offset), "stop-color": color },
        }),
      ),
    }),
  }
}

function createPhaseSkewElement({
  name,
  attributes,
  children = [],
}: Pick<SvgObject, "name" | "attributes"> &
  Partial<Pick<SvgObject, "children">>): SvgObject {
  return { name, type: "element", value: "", attributes, children }
}
