import type { PcbDifferentialPairPhaseSkewSegment, Point } from "circuit-json"
import { svgElement } from "lib/sim/simulation-graph-svg/simulation-graph-svg-shared"
import type { SvgObject } from "lib/svg-object"

type PhaseSkewSpan = Pick<
  PcbDifferentialPairPhaseSkewSegment,
  "start" | "end"
> & {
  radius: number
  startColor: string
  endColor: string
}

type Cut = ReturnType<typeof getCut>

// Extend the color polygons past the outline so the clip alone antialiases
// the silhouette. Their shared cuts are rasterized without antialiasing.
const COLOR_OVERHANG_SVG_PX = 1
const MITER_LIMIT = 4 // SVG default miter limit

export function createPhaseSkewRun(
  spans: [PhaseSkewSpan, ...PhaseSkewSpan[]],
  attributes: SvgObject["attributes"],
  defs: SvgObject["children"],
): SvgObject {
  const [first, ...rest] = spans
  const clipId = `pcb-phase-skew-run-${defs.length}`
  const clipAttributes = { d: "" }
  defs.push(
    svgElement("clipPath", { id: clipId }, [
      svgElement("path", clipAttributes),
    ]),
  )

  const leftEdge: string[] = []
  const rightEdge: string[] = []
  let previous = first
  let normal = getNormal(first)
  let startOffset: Point = normal
  const startCap = getCut(first.start, normal, first.radius)
  const fills = [createCapFill(first, normal, "start")]

  const appendSpan = (
    span: PhaseSkewSpan,
    startOffset: Point,
    endOffset: Point,
  ) => {
    const start = getCut(span.start, startOffset, span.radius)
    const end = getCut(span.end, endOffset, span.radius)
    leftEdge.push(svgPoint(start.left), svgPoint(end.left))
    rightEdge.push(svgPoint(start.right), svgPoint(end.right))

    const radius = span.radius + COLOR_OVERHANG_SVG_PX
    fills.push(
      ...createSpanFills(
        getCut(span.start, startOffset, radius),
        getCut(span.end, endOffset, radius),
        span,
        defs,
      ),
    )
  }

  for (const next of rest) {
    const nextNormal = getNormal(next)
    const sum = { x: normal.x + nextNormal.x, y: normal.y + nextNormal.y }
    const projection = sum.x * normal.x + sum.y * normal.y
    const along = Math.abs(sum.x * normal.y - sum.y * normal.x)
    const radius =
      Math.max(previous.radius, next.radius) + COLOR_OVERHANG_SVG_PX
    // Bound the miter and keep cuts from crossing on short spans.
    const scale = Math.min(
      1 / projection,
      MITER_LIMIT / Math.hypot(sum.x, sum.y),
      Math.min(normal.length, nextNormal.length) / (2 * along * radius),
    )
    const endOffset = { x: sum.x * scale, y: sum.y * scale }
    appendSpan(previous, startOffset, endOffset)
    previous = next
    startOffset = endOffset
    normal = nextNormal
  }
  appendSpan(previous, startOffset, normal)

  const endCap = getCut(previous.end, normal, previous.radius)
  fills.push(createCapFill(previous, normal, "end"))

  clipAttributes.d = [
    `M ${leftEdge.join(" L ")}`,
    `A ${previous.radius} ${previous.radius} 0 0 0 ${svgPoint(endCap.right)}`,
    `L ${rightEdge.slice(0, -1).reverse().join(" L ")}`,
    `A ${first.radius} ${first.radius} 0 0 0 ${svgPoint(startCap.left)} Z`,
  ].join(" ")
  return svgElement(
    "g",
    { ...attributes, "clip-path": `url(#${clipId})` },
    fills,
  )
}

function getNormal({ start, end }: Pick<PhaseSkewSpan, "start" | "end">) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  return { x: -dy / length, y: dx / length, length }
}

function getCut(point: Point, offset: Point, radius: number) {
  return {
    left: { x: point.x + offset.x * radius, y: point.y + offset.y * radius },
    right: { x: point.x - offset.x * radius, y: point.y - offset.y * radius },
  }
}

function svgPoint({ x, y }: Point): string {
  return `${x},${y}`
}

function createFill(points: Point[], color: string): SvgObject {
  return svgElement("polygon", {
    points: points.map(svgPoint).join(" "),
    fill: color,
    "shape-rendering": "crispEdges",
  })
}

function createCapFill(
  span: PhaseSkewSpan,
  normal: Point,
  end: "start" | "end",
) {
  const radius = span.radius + COLOR_OVERHANG_SVG_PX
  const cut = getCut(span[end], normal, radius)
  const extension = end === "start" ? -radius : radius
  const color = end === "start" ? span.startColor : span.endColor
  const extended = [cut.right, cut.left].map(({ x, y }) => ({
    x: x + normal.y * extension,
    y: y - normal.x * extension,
  }))
  return createFill([cut.left, cut.right, ...extended], color)
}

function projectOntoCut(point: Point, { left, right }: Cut): Point {
  const dx = right.x - left.x
  const dy = right.y - left.y
  const along =
    ((point.x - left.x) * dx + (point.y - left.y) * dy) / (dx * dx + dy * dy)
  return { x: left.x + along * dx, y: left.y + along * dy }
}

function createSpanFills(
  startCut: Cut,
  endCut: Cut,
  span: PhaseSkewSpan,
  defs: SvgObject["children"],
) {
  const { left: startLeft, right: startRight } = startCut
  const { left: endLeft, right: endRight } = endCut
  if (span.startColor === span.endColor) {
    return [
      createFill([startLeft, startRight, endRight, endLeft], span.startColor),
    ]
  }

  // Two triangles let the gradient match both cut angles and meet on the diagonal.
  const firstStart = projectOntoCut(endRight, startCut)
  const secondEnd = projectOntoCut(startLeft, endCut)
  const firstColor = addPhaseSkewGradient(firstStart, endRight, span, defs)
  const secondColor = addPhaseSkewGradient(startLeft, secondEnd, span, defs)
  return [
    createFill([startLeft, startRight, endRight], firstColor),
    createFill([startLeft, endRight, endLeft], secondColor),
  ]
}

export function addPhaseSkewGradient(
  start: Point,
  end: Point,
  { startColor, endColor }: Pick<PhaseSkewSpan, "startColor" | "endColor">,
  defs: SvgObject["children"],
): string {
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
