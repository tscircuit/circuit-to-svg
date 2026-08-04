import { type PcbCopperPour, type Point, distance } from "circuit-json"
import type { PcbTraceSegment } from "./get-pcb-trace-segments"

const EPSILON = 1e-9

type NumericPoint = { x: number; y: number }
type RingPoint = NumericPoint & { bulge?: number }

/**
 * Same-net route points are marked when an adjacent segment is fully inside a
 * copper pour, but no route point is added at the boundary. Clip the transition
 * segment so the rendered trace ends exactly where it enters the pour.
 */
export function clipPcbTraceSegmentAtCopperPourBoundary(
  segment: PcbTraceSegment,
  pour: PcbCopperPour,
): PcbTraceSegment | null {
  const { startIsInsideCopperPour, endIsInsideCopperPour, start, end } = segment

  if (startIsInsideCopperPour === endIsInsideCopperPour) return segment

  const numericStart = toNumericPoint(start)
  const numericEnd = toNumericPoint(end)
  const intersectionFractions = getBoundaryRings(pour).flatMap((ring) =>
    getRingIntersectionFractions(ring, numericStart, numericEnd),
  )

  if (intersectionFractions.length === 0) return segment

  const intersectionFraction = endIsInsideCopperPour
    ? Math.min(...intersectionFractions)
    : Math.max(...intersectionFractions)
  const intersection = interpolatePoint(
    numericStart,
    numericEnd,
    intersectionFraction,
  )
  const clippedSegment = {
    ...segment,
    start: startIsInsideCopperPour ? intersection : start,
    end: endIsInsideCopperPour ? intersection : end,
  }

  return areSamePoint(clippedSegment.start, clippedSegment.end)
    ? null
    : clippedSegment
}

function getBoundaryRings(pour: PcbCopperPour): RingPoint[][] {
  switch (pour.shape) {
    case "rect":
      return [getRectRing(pour)]
    case "polygon":
      return [pour.points.map(toNumericPoint)]
    case "brep":
      return [
        pour.brep_shape.outer_ring.vertices.map(toRingPoint),
        ...pour.brep_shape.inner_rings.map((ring) =>
          ring.vertices.map(toRingPoint),
        ),
      ]
  }
}

function getRectRing(
  pour: Extract<PcbCopperPour, { shape: "rect" }>,
): RingPoint[] {
  const center = toNumericPoint(pour.center)
  const halfWidth = pour.width / 2
  const halfHeight = pour.height / 2
  const rotationRadians = ((pour.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(rotationRadians)
  const sin = Math.sin(rotationRadians)

  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ].map((point) => ({
    x: center.x + point.x * cos - point.y * sin,
    y: center.y + point.x * sin + point.y * cos,
  }))
}

function getRingIntersectionFractions(
  ring: RingPoint[],
  traceStart: NumericPoint,
  traceEnd: NumericPoint,
): number[] {
  const intersectionFractions: number[] = []

  for (let index = 0; index < ring.length; index++) {
    const start = ring[index]
    const end = ring[(index + 1) % ring.length]
    if (!start || !end) continue

    if (start.bulge) {
      intersectionFractions.push(
        ...getLineArcIntersectionFractions(
          traceStart,
          traceEnd,
          start,
          end,
          start.bulge,
        ),
      )
      continue
    }

    const intersectionFraction = getLineSegmentIntersectionFraction(
      traceStart,
      traceEnd,
      start,
      end,
    )
    if (intersectionFraction !== null) {
      intersectionFractions.push(intersectionFraction)
    }
  }

  return intersectionFractions
}

function getLineArcIntersectionFractions(
  traceStart: NumericPoint,
  traceEnd: NumericPoint,
  arcStart: NumericPoint,
  arcEnd: NumericPoint,
  bulge: number,
): number[] {
  const chordX = arcEnd.x - arcStart.x
  const chordY = arcEnd.y - arcStart.y
  const chordLength = Math.hypot(chordX, chordY)
  if (chordLength < EPSILON || Math.abs(bulge) < EPSILON) {
    const intersectionFraction = getLineSegmentIntersectionFraction(
      traceStart,
      traceEnd,
      arcStart,
      arcEnd,
    )
    return intersectionFraction === null ? [] : [intersectionFraction]
  }

  const centerOffset = (chordLength * (1 - bulge ** 2)) / (4 * bulge)
  const center = {
    x: (arcStart.x + arcEnd.x) / 2 - (chordY / chordLength) * centerOffset,
    y: (arcStart.y + arcEnd.y) / 2 + (chordX / chordLength) * centerOffset,
  }
  const startAngle = Math.atan2(arcStart.y - center.y, arcStart.x - center.x)
  const sweepAngle = 4 * Math.atan(bulge)
  const radius = Math.hypot(arcStart.x - center.x, arcStart.y - center.y)
  const traceVector = {
    x: traceEnd.x - traceStart.x,
    y: traceEnd.y - traceStart.y,
  }
  const centerToTraceStart = {
    x: traceStart.x - center.x,
    y: traceStart.y - center.y,
  }
  const quadraticA = dot(traceVector, traceVector)
  if (quadraticA < EPSILON) return []

  const quadraticB = 2 * dot(centerToTraceStart, traceVector)
  const quadraticC = dot(centerToTraceStart, centerToTraceStart) - radius ** 2
  const discriminant = quadraticB ** 2 - 4 * quadraticA * quadraticC
  if (discriminant < -EPSILON) return []

  const squareRootDiscriminant = Math.sqrt(Math.max(0, discriminant))
  return [
    (-quadraticB - squareRootDiscriminant) / (2 * quadraticA),
    (-quadraticB + squareRootDiscriminant) / (2 * quadraticA),
  ].filter((traceFraction) => {
    if (traceFraction < -EPSILON || traceFraction > 1 + EPSILON) return false

    const intersection = interpolatePoint(traceStart, traceEnd, traceFraction)
    const intersectionAngle = Math.atan2(
      intersection.y - center.y,
      intersection.x - center.x,
    )
    const angleFromArcStart =
      sweepAngle > 0
        ? normalizePositiveAngle(intersectionAngle - startAngle)
        : normalizePositiveAngle(startAngle - intersectionAngle)

    return angleFromArcStart <= Math.abs(sweepAngle) + EPSILON
  })
}

function getLineSegmentIntersectionFraction(
  traceStart: NumericPoint,
  traceEnd: NumericPoint,
  boundaryStart: NumericPoint,
  boundaryEnd: NumericPoint,
): number | null {
  const traceVector = {
    x: traceEnd.x - traceStart.x,
    y: traceEnd.y - traceStart.y,
  }
  const boundaryVector = {
    x: boundaryEnd.x - boundaryStart.x,
    y: boundaryEnd.y - boundaryStart.y,
  }
  const denominator = cross(traceVector, boundaryVector)
  if (Math.abs(denominator) < EPSILON) return null

  const offset = {
    x: boundaryStart.x - traceStart.x,
    y: boundaryStart.y - traceStart.y,
  }
  const traceFraction = cross(offset, boundaryVector) / denominator
  const boundaryFraction = cross(offset, traceVector) / denominator

  if (
    traceFraction < -EPSILON ||
    traceFraction > 1 + EPSILON ||
    boundaryFraction < -EPSILON ||
    boundaryFraction > 1 + EPSILON
  ) {
    return null
  }

  return Math.min(1, Math.max(0, traceFraction))
}

function cross(a: NumericPoint, b: NumericPoint): number {
  return a.x * b.y - a.y * b.x
}

function dot(a: NumericPoint, b: NumericPoint): number {
  return a.x * b.x + a.y * b.y
}

function normalizePositiveAngle(angle: number): number {
  const fullTurn = 2 * Math.PI
  const normalized = angle % fullTurn
  return normalized < 0 ? normalized + fullTurn : normalized
}

function interpolatePoint(
  start: NumericPoint,
  end: NumericPoint,
  fraction: number,
): NumericPoint {
  return {
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction,
  }
}

function toNumericPoint(point: Point): NumericPoint {
  return {
    x: distance.parse(point.x),
    y: distance.parse(point.y),
  }
}

function toRingPoint(point: Point & { bulge?: number }): RingPoint {
  return { ...toNumericPoint(point), bulge: point.bulge }
}

function areSamePoint(a: Point, b: Point): boolean {
  const numericA = toNumericPoint(a)
  const numericB = toNumericPoint(b)
  return (
    Math.abs(numericA.x - numericB.x) < EPSILON &&
    Math.abs(numericA.y - numericB.y) < EPSILON
  )
}
