import type {
  AnyCircuitElement,
  PcbDifferentialPairPhaseSkewSegment,
  Point,
} from "circuit-json"
import Color from "color"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint } from "transformation-matrix"
import type {
  PcbContext,
  PhaseSkewColors,
} from "../convert-circuit-json-to-pcb-svg"
import {
  createPcbTraceStroke,
  getPcbTraceStrokeWidth,
} from "./create-pcb-trace-stroke"

/** Overlay strokes are drawn 10% wider than the copper, as KiCad does (diff_phase_skew_tool.cpp), so the colour fully covers the trace edges. */
const OVERLAY_WIDTH_FACTOR = 1.1
const JOINT_TOLERANCE_MM = 1e-6
const PHASE_SKEW_CLASS = "pcb-differential-pair-phase-skew"
const PHASE_SKEW_TYPE = "pcb_differential_pair_phase_skew"
const FNV_OFFSET_BASIS = 0xcbf29ce484222325n
const FNV_PRIME = 0x100000001b3n
const HASH_BITS = 64
const DEFAULT_PHASE_SKEW_COLORS = {
  positive: "rgb(0, 0, 255)",
  negative: "rgb(255, 0, 0)",
  zero: "rgb(255, 255, 255)",
}

interface PhaseSkewSvgObjects {
  strokes: SvgObject[]
  defs?: SvgObject
}

/** Draw stored phase skew segments above their layer's copper. */
export function getPhaseSkewStrokes({
  elements,
  fullScaleMm: defaultFullScaleMm,
  fullScaleMmBySourceBusId,
  colors,
  ctx: { layer, transform },
  phaseSkewIdPrefix = "",
}: {
  elements: AnyCircuitElement[]
  fullScaleMm: number
  fullScaleMmBySourceBusId?: Record<string, number>
  colors?: PhaseSkewColors
  ctx: Pick<PcbContext, "layer" | "transform">
  phaseSkewIdPrefix?: string
}): PhaseSkewSvgObjects {
  const fills: SvgObject[] = []
  const strokes: SvgObject[] = []
  const gradients: SvgObject[] = []

  for (const element of elements) {
    if (element.type !== PHASE_SKEW_TYPE) continue
    const { source_bus_id } = element
    const fullScaleMm =
      fullScaleMmBySourceBusId &&
      Object.hasOwn(fullScaleMmBySourceBusId, source_bus_id)
        ? (fullScaleMmBySourceBusId[source_bus_id] ?? defaultFullScaleMm)
        : defaultFullScaleMm

    for (const polarity of ["positive_trace", "negative_trace"] as const) {
      const trace = element[polarity]
      const segments = trace.segments.flatMap((segment) =>
        splitPhaseSkewSegmentAtFullScale({ segment, fullScaleMm }),
      )
      for (const [index, segment] of segments.entries()) {
        if (layer && segment.layer !== layer) continue

        const previous = segments[index - 1]
        const next = segments[index + 1]
        const joinsPrevious =
          previous !== undefined && canJoinSegments({ previous, next: segment })
        const joinsNext =
          next !== undefined && canJoinSegments({ previous: segment, next })
        const isInRun = joinsPrevious || joinsNext
        const start = joinsPrevious ? previous.end : segment.start
        const { end } = segment
        const svgStart = applyToPoint(transform, start)
        const svgEnd = applyToPoint(transform, end)
        const width = segment.width * OVERLAY_WIDTH_FACTOR

        const startColor = getPhaseSkewColor({
          lengthDifferenceMm: segment.start_length_difference_mm,
          fullScaleMm,
          colors,
        })
        const endColor = getPhaseSkewColor({
          lengthDifferenceMm: segment.end_length_difference_mm,
          fullScaleMm,
          colors,
        })
        // On the zero scale any nonzero part of a segment is full color.
        let color =
          fullScaleMm === 0 && segment.start_length_difference_mm === 0
            ? endColor
            : startColor
        if (fullScaleMm > 0 && startColor !== endColor) {
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
                  width: previous.width * OVERLAY_WIDTH_FACTOR,
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
              color: fullScaleMm === 0 ? color : startColor,
              layer: segment.layer,
            }),
          )
          if (!joinsNext)
            fills.push(
              createPhaseSkewDisc({
                center: svgEnd,
                radius: strokeWidth / 2,
                color: fullScaleMm === 0 ? color : endColor,
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

/** Split at the point where the overlay starts or stops saturating. */
export function splitPhaseSkewSegmentAtFullScale({
  segment,
  fullScaleMm,
}: {
  segment: PcbDifferentialPairPhaseSkewSegment
  fullScaleMm: number
}): PcbDifferentialPairPhaseSkewSegment[] {
  const { start, end, start_length_difference_mm, end_length_difference_mm } =
    segment
  const startMagnitude = Math.abs(start_length_difference_mm)
  const endMagnitude = Math.abs(end_length_difference_mm)
  if (
    fullScaleMm <= Math.min(startMagnitude, endMagnitude) ||
    fullScaleMm >= Math.max(startMagnitude, endMagnitude)
  ) {
    return [segment]
  }

  const fraction =
    (fullScaleMm - startMagnitude) / (endMagnitude - startMagnitude)
  const point = {
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction,
  }
  const difference =
    Math.sign(start_length_difference_mm || end_length_difference_mm) *
    fullScaleMm
  return [
    { ...segment, end: point, end_length_difference_mm: difference },
    { ...segment, start: point, start_length_difference_mm: difference },
  ]
}

/** Interpolate the overlay color in sRGB. */
export function getPhaseSkewColor({
  lengthDifferenceMm,
  fullScaleMm,
  colors,
}: {
  lengthDifferenceMm: number
  fullScaleMm: number
  colors?: PhaseSkewColors
}): string {
  const zero = colors?.zero ?? DEFAULT_PHASE_SKEW_COLORS.zero
  if (lengthDifferenceMm === 0) return zero

  const polarity = lengthDifferenceMm > 0 ? "positive" : "negative"
  const target = colors?.[polarity] ?? DEFAULT_PHASE_SKEW_COLORS[polarity]
  const fraction =
    fullScaleMm === 0
      ? 1
      : Math.min(1, Math.abs(lengthDifferenceMm) / fullScaleMm)
  if (fraction === 1) return target

  const from = Color(zero)
  const to = Color(target)
  const channels = (["red", "green", "blue"] as const).map((channel) => {
    const percent =
      (100 * (from[channel]() * (1 - fraction) + to[channel]() * fraction)) /
      255
    return `${percent.toFixed(8).replace(/\.?0+$/, "")}%`
  })
  const alpha = from.alpha() * (1 - fraction) + to.alpha() * fraction
  return alpha === 1
    ? `rgb(${channels.join(", ")})`
    : `rgba(${channels.join(", ")}, ${alpha})`
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
