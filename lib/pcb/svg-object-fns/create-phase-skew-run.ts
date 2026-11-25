import type { Point } from "circuit-json"
import { svgElement } from "lib/sim/simulation-graph-svg/simulation-graph-svg-shared"
import type { SvgObject } from "lib/svg-object"

export interface PhaseSkewSpan {
  start: Point
  end: Point
  radius: number
  startColor: string
  endColor: string
}

interface Cut {
  left: Point
  right: Point
}

// Extend the color polygons past the outline so the clip alone antialiases
// the silhouette. Their shared cuts are rasterized without antialiasing.
const COLOR_OVERHANG_SVG_PX = 1
const MITER_LIMIT = 4 // SVG default miter limit

export function createPhaseSkewRun({
  spans,
  attributes,
  defs,
}: {
  spans: PhaseSkewSpan[]
  attributes: Record<string, string>
  defs: SvgObject[]
}): SvgObject {
  const normals = spans.map(({ start, end }) => {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    return { x: -dy / length, y: dx / length, length }
  })
  const offsets: Point[] = [normals[0]!]
  for (let i = 1; i < spans.length; i++) {
    const before = normals[i - 1]!
    const after = normals[i]!
    const sum = { x: before.x + after.x, y: before.y + after.y }
    const projection = sum.x * before.x + sum.y * before.y
    const along = Math.abs(sum.x * before.y - sum.y * before.x)
    const radius =
      Math.max(spans[i - 1]!.radius, spans[i]!.radius) + COLOR_OVERHANG_SVG_PX
    // Bound the miter and keep cuts from crossing on short spans.
    const scale = Math.min(
      1 / projection,
      MITER_LIMIT / Math.hypot(sum.x, sum.y),
      Math.min(before.length, after.length) / (2 * along * radius),
    )
    offsets.push({ x: sum.x * scale, y: sum.y * scale })
  }
  offsets.push(normals.at(-1)!)

  const outline = spans.map(({ start, end, radius }, i) => ({
    start: getCut({ point: start, offset: offsets[i]!, radius }),
    end: getCut({ point: end, offset: offsets[i + 1]!, radius }),
  }))
  const first = outline[0]!
  const last = outline.at(-1)!
  const startRadius = spans[0]!.radius
  const endRadius = spans.at(-1)!.radius
  const leftEdge = outline.flatMap(({ start, end }) => [start.left, end.left])
  const rightEdge = outline
    .flatMap(({ start, end }) => [start.right, end.right])
    .reverse()
  const clipId = `pcb-phase-skew-run-${defs.length}`
  defs.push(
    svgElement("clipPath", { id: clipId }, [
      svgElement("path", {
        d: [
          `M ${leftEdge.map(svgPoint).join(" L ")}`,
          `A ${endRadius} ${endRadius} 0 0 0 ${svgPoint(last.end.right)}`,
          `L ${rightEdge.slice(1).map(svgPoint).join(" L ")}`,
          `A ${startRadius} ${startRadius} 0 0 0 ${svgPoint(first.start.left)} Z`,
        ].join(" "),
      }),
    ]),
  )

  const fills = spans.flatMap(
    ({ start, end, radius, startColor, endColor }, i) => {
      const wideRadius = radius + COLOR_OVERHANG_SVG_PX
      const startCut = getCut({
        point: start,
        offset: offsets[i]!,
        radius: wideRadius,
      })
      const endCut = getCut({
        point: end,
        offset: offsets[i + 1]!,
        radius: wideRadius,
      })
      const patches = createSpanFills({
        startCut,
        endCut,
        startColor,
        endColor,
        defs,
      })
      if (i === 0) {
        patches.unshift(
          createCapFill({
            cut: startCut,
            normal: normals[i]!,
            extension: -wideRadius,
            color: startColor,
          }),
        )
      }
      if (i === spans.length - 1) {
        patches.push(
          createCapFill({
            cut: endCut,
            normal: normals[i]!,
            extension: wideRadius,
            color: endColor,
          }),
        )
      }
      return patches
    },
  )

  return svgElement(
    "g",
    { ...attributes, "clip-path": `url(#${clipId})` },
    fills,
  )
}

function getCut({
  point,
  offset,
  radius,
}: { point: Point; offset: Point; radius: number }): Cut {
  return {
    left: { x: point.x + offset.x * radius, y: point.y + offset.y * radius },
    right: { x: point.x - offset.x * radius, y: point.y - offset.y * radius },
  }
}

function svgPoint({ x, y }: Point): string {
  return `${x},${y}`
}

function createFill({
  points,
  color,
}: { points: Point[]; color: string }): SvgObject {
  return svgElement("polygon", {
    points: points.map(svgPoint).join(" "),
    fill: color,
    "shape-rendering": "crispEdges",
  })
}

function createCapFill({
  cut,
  normal,
  extension,
  color,
}: { cut: Cut; normal: Point; extension: number; color: string }): SvgObject {
  const extended = [cut.right, cut.left].map(({ x, y }) => ({
    x: x + normal.y * extension,
    y: y - normal.x * extension,
  }))
  return createFill({ points: [cut.left, cut.right, ...extended], color })
}

function projectOntoCut({
  point,
  cut: { left, right },
}: { point: Point; cut: Cut }): Point {
  const dx = right.x - left.x
  const dy = right.y - left.y
  const along =
    ((point.x - left.x) * dx + (point.y - left.y) * dy) / (dx * dx + dy * dy)
  return { x: left.x + along * dx, y: left.y + along * dy }
}

function createSpanFills({
  startCut,
  endCut,
  startColor,
  endColor,
  defs,
}: {
  startCut: Cut
  endCut: Cut
  startColor: string
  endColor: string
  defs: SvgObject[]
}): SvgObject[] {
  const points = [startCut.left, startCut.right, endCut.right, endCut.left]
  if (startColor === endColor)
    return [createFill({ points, color: startColor })]

  // A linear gradient can match both end colors across a triangle. Two
  // triangles let each end have its own cut angle and agree on the diagonal.
  return [
    createFill({
      points: points.slice(0, 3),
      color: addPhaseSkewGradient({
        start: projectOntoCut({ point: endCut.right, cut: startCut }),
        end: endCut.right,
        startColor,
        endColor,
        defs,
      }),
    }),
    createFill({
      points: [startCut.left, endCut.right, endCut.left],
      color: addPhaseSkewGradient({
        start: startCut.left,
        end: projectOntoCut({ point: startCut.left, cut: endCut }),
        startColor,
        endColor,
        defs,
      }),
    }),
  ]
}

export function addPhaseSkewGradient({
  start,
  end,
  startColor,
  endColor,
  defs,
}: {
  start: Point
  end: Point
  startColor: string
  endColor: string
  defs: SvgObject[]
}): string {
  const id = `pcb-phase-skew-gradient-${defs.length}`
  defs.push(
    svgElement(
      "linearGradient",
      {
        id,
        gradientUnits: "userSpaceOnUse",
        x1: String(start.x),
        y1: String(start.y),
        x2: String(end.x),
        y2: String(end.y),
      },
      [startColor, endColor].map((color, offset) =>
        svgElement("stop", { offset: String(offset), "stop-color": color }),
      ),
    ),
  )
  return `url(#${id})`
}
