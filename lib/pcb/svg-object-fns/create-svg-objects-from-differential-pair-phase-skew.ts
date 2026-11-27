import type {
  AnyCircuitElement,
  PcbDifferentialPairPhaseSkewSegment,
  Point,
} from "circuit-json"
import Color from "color"
import type { SvgObject } from "lib/svg-object"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import {
  createPcbTraceStroke,
  getPcbTraceStrokeWidth,
} from "./create-pcb-trace-stroke"

/** Overlay strokes are drawn 10% wider than the copper, as KiCad does (diff_phase_skew_tool.cpp), so the colour fully covers the trace edges. */
const OVERLAY_WIDTH_FACTOR = 1.1
const JOINT_TOLERANCE_MM = 1e-6
export const DEFAULT_PHASE_SKEW_FULL_SCALE_MM = 2
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

export type PhaseSkewColors = Partial<typeof DEFAULT_PHASE_SKEW_COLORS>

interface PhaseSkewSvgObjects {
  strokes: SvgObject[]
  defs?: SvgObject
}

/** Draw stored phase skew segments above their layer's copper. */
export function getPhaseSkewStrokes({
  elements,
  colors,
  ctx: { layer, transform },
}: {
  elements: readonly AnyCircuitElement[]
  colors?: PhaseSkewColors
  ctx: Pick<PcbContext, "layer" | "transform">
}): PhaseSkewSvgObjects {
  const fills: SvgObject[] = []
  const strokes: SvgObject[] = []
  const gradients: SvgObject[] = []
  const fullScaleMmBySourceBusId = getPhaseSkewFullScaleMmBySourceBusId({
    elements,
  })

  for (const element of elements) {
    if (element.type !== PHASE_SKEW_TYPE) continue
    const fullScaleMm =
      fullScaleMmBySourceBusId[element.source_bus_id] ??
      DEFAULT_PHASE_SKEW_FULL_SCALE_MM

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

        const {
          start_length_difference_mm: startDifference,
          end_length_difference_mm: endDifference,
        } = segment
        // At zero full scale, any nonzero part of the segment is saturated.
        const startColor = getPhaseSkewColor({
          lengthDifferenceMm:
            fullScaleMm === 0
              ? startDifference || endDifference
              : startDifference,
          fullScaleMm,
          colors,
        })
        const endColor = getPhaseSkewColor({
          lengthDifferenceMm:
            fullScaleMm === 0
              ? endDifference || startDifference
              : endDifference,
          fullScaleMm,
          colors,
        })
        let color = startColor
        if (startColor !== endColor) {
          const { id, gradient } = createPhaseSkewGradient({
            identity: [
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

export function getPhaseSkewFullScaleMmBySourceBusId({
  elements,
}: {
  elements: readonly AnyCircuitElement[]
}): Record<string, number> {
  const limits: Record<string, number> = Object.create(null)
  for (const element of elements) {
    if (
      element.type === "source_bus" &&
      element.max_length_skew !== undefined
    ) {
      limits[element.source_bus_id] = element.max_length_skew
    }
  }
  return limits
}

export function splitPhaseSkewSegmentAtFullScale({
  segment,
  fullScaleMm,
}: {
  segment: PcbDifferentialPairPhaseSkewSegment
  fullScaleMm: number
}): PcbDifferentialPairPhaseSkewSegment[] {
  const {
    start,
    end,
    start_length_difference_mm: startDifference,
    end_length_difference_mm: endDifference,
  } = segment
  const startMagnitude = Math.abs(startDifference)
  const endMagnitude = Math.abs(endDifference)
  if (
    Math.min(startMagnitude, endMagnitude) >= fullScaleMm ||
    Math.max(startMagnitude, endMagnitude) <= fullScaleMm
  ) {
    return [segment]
  }

  const fraction =
    (fullScaleMm - startMagnitude) / (endMagnitude - startMagnitude)
  const crossing = {
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction,
  }
  const crossingDifference =
    Math.sign(endDifference || startDifference) * fullScaleMm
  return [
    { ...segment, end: crossing, end_length_difference_mm: crossingDifference },
    {
      ...segment,
      start: crossing,
      start_length_difference_mm: crossingDifference,
    },
  ]
}

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
  const saturated = colors?.[polarity] ?? DEFAULT_PHASE_SKEW_COLORS[polarity]
  if (fullScaleMm === 0 || Math.abs(lengthDifferenceMm) >= fullScaleMm) {
    return saturated
  }

  const fraction = Math.abs(lengthDifferenceMm) / fullScaleMm
  const from = Color(zero.trim()).rgb()
  const to = Color(saturated.trim()).rgb()
  const toChannels = to.unitArray()
  // Use percentages to retain fractional channels in SVG 1.1.
  const rgb = from
    .unitArray()
    .slice(0, 3)
    .map((channel, index) => {
      const percent =
        (channel + (toChannels[index]! - channel) * fraction) * 100
      return `${Number(percent.toFixed(6))}%`
    })
    .join(", ")
  const alpha = from.alpha() + (to.alpha() - from.alpha()) * fraction
  return alpha === 1
    ? `rgb(${rgb})`
    : `rgba(${rgb}, ${Number(alpha.toFixed(6))})`
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
