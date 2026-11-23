import type { CircuitJson, Point } from "circuit-json"
import type { ReactElement } from "react"
import { Circuit } from "tscircuit-phase-skew-fixtures"

export const FORUM_BOARD_WIDTH_MM = 22
export const FORUM_BOARD_HEIGHT_MM = 12

type ImageVertex = [x: number, y: number, radius?: number]
type ForumPair = "differential" | "arbitrary"

const PIXELS_PER_MM = 47
const IMAGE_CENTER_X = 641
const IMAGE_CENTER_Y = 400
const SOURCE_X = 194.5
const LOAD_X = 1087.5
const POSITIVE_PAD_Y = 306.45
const NEGATIVE_PAD_Y = POSITIVE_PAD_Y + 1.65 * PIXELS_PER_MM
const UPPER_STRAIGHT_PAD_Y = POSITIVE_PAD_Y + 5 * PIXELS_PER_MM
const LOWER_STRAIGHT_PAD_Y = NEGATIVE_PAD_Y + 5 * PIXELS_PER_MM

const DIAGONAL = Math.SQRT1_2
const TRACE_WIDTH_MM = 0.2

// Vertices were estimated against the forum poster at 1280 px wide. Convert
// them to millimetres and flip Y to match PCB coordinates.
function pcbPoint(x: number, y: number): Point {
  return {
    x: (x - IMAGE_CENTER_X) / PIXELS_PER_MM,
    y: (IMAGE_CENTER_Y - y) / PIXELS_PER_MM,
  }
}

function tuningBump(
  x: number,
  y: number,
  dx: number,
  dy: number,
  depth: number,
): ImageVertex[] {
  const width = 28.2
  const radius = 11.75
  const farX = x + width * dx
  const farY = y + width * dy
  return [
    [x, y, radius],
    [x + depth * dy, y - depth * dx, radius],
    [farX + depth * dy, farY - depth * dx, radius],
    [farX, farY, radius],
  ]
}

// Core's pcbPath is relative to the source component center. Sample each
// round corner into straight pieces, preserving the long straight stretches.
function relativePath(sourceCenterY: number, vertices: ImageVertex[]): Point[] {
  const [startX] = vertices[0]!
  return vertices.slice(1, -1).flatMap(([x, y, radius], index) => {
    if (!radius)
      return [
        {
          x: (x - startX) / PIXELS_PER_MM,
          y: (sourceCenterY - y) / PIXELS_PER_MM,
        },
      ]

    const [prevX, prevY] = vertices[index]!
    const [nextX, nextY] = vertices[index + 2]!
    const inAngle = Math.atan2(y - prevY, x - prevX)
    const outAngle = Math.atan2(nextY - y, nextX - x)
    const angleDiff = outAngle - inAngle
    const turn = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
    const sign = Math.sign(turn)
    const tangent = radius * Math.tan(Math.abs(turn) / 2)
    const centerX =
      x - tangent * Math.cos(inAngle) - sign * radius * Math.sin(inAngle)
    const centerY =
      y - tangent * Math.sin(inAngle) + sign * radius * Math.cos(inAngle)
    const startAngle = inAngle - (sign * Math.PI) / 2
    const chords = 10

    return Array.from({ length: chords + 1 }, (_, step) => {
      const angle = startAngle + (turn * step) / chords
      const arcX = centerX + radius * Math.cos(angle)
      const arcY = centerY + radius * Math.sin(angle)
      return {
        x: (arcX - startX) / PIXELS_PER_MM,
        y: (sourceCenterY - arcY) / PIXELS_PER_MM,
      }
    })
  })
}

const FANOUT_CENTER_Y = (POSITIVE_PAD_Y + NEGATIVE_PAD_Y) / 2
const POSITIVE_FANOUT_Y = FANOUT_CENTER_Y - 10.5
const NEGATIVE_FANOUT_Y = FANOUT_CENTER_Y + 10.5
const FANOUT_RUN = POSITIVE_FANOUT_Y - POSITIVE_PAD_Y
const POSITIVE_RISE_X = 363.5
const NEGATIVE_RISE_X = 373.1
const POSITIVE_TOP_Y = 225
const NEGATIVE_TOP_Y = 246
const POSITIVE_FALL_X = 857
const NEGATIVE_FALL_X = 848

const POSITIVE_PATH = relativePath(FANOUT_CENTER_Y, [
  [SOURCE_X, POSITIVE_PAD_Y],
  [227, POSITIVE_PAD_Y],
  [227 + FANOUT_RUN, POSITIVE_FANOUT_Y],
  [POSITIVE_RISE_X, POSITIVE_FANOUT_Y],
  ...tuningBump(
    423.5,
    POSITIVE_FANOUT_Y - (423.5 - POSITIVE_RISE_X),
    DIAGONAL,
    -DIAGONAL,
    47,
  ),
  [POSITIVE_RISE_X + POSITIVE_FANOUT_Y - POSITIVE_TOP_Y, POSITIVE_TOP_Y],
  ...tuningBump(577, POSITIVE_TOP_Y, 1, 0, 47),
  [POSITIVE_FALL_X, POSITIVE_TOP_Y],
  ...tuningBump(
    909.5,
    POSITIVE_TOP_Y + (909.5 - POSITIVE_FALL_X),
    DIAGONAL,
    DIAGONAL,
    47,
  ),
  [POSITIVE_FALL_X + POSITIVE_FANOUT_Y - POSITIVE_TOP_Y, POSITIVE_FANOUT_Y],
  [1055 - FANOUT_RUN, POSITIVE_FANOUT_Y],
  [1055, POSITIVE_PAD_Y],
  [LOAD_X, POSITIVE_PAD_Y],
])

const NEGATIVE_PATH = relativePath(FANOUT_CENTER_Y, [
  [SOURCE_X, NEGATIVE_PAD_Y],
  [227, NEGATIVE_PAD_Y],
  [227 + FANOUT_RUN, NEGATIVE_FANOUT_Y],
  [NEGATIVE_RISE_X, NEGATIVE_FANOUT_Y],
  [NEGATIVE_RISE_X + NEGATIVE_FANOUT_Y - NEGATIVE_TOP_Y, NEGATIVE_TOP_Y],
  ...tuningBump(666, NEGATIVE_TOP_Y, 1, 0, -47),
  ...tuningBump(722.4, NEGATIVE_TOP_Y, 1, 0, -47),
  ...tuningBump(778.8, NEGATIVE_TOP_Y, 1, 0, -47),
  [NEGATIVE_FALL_X, NEGATIVE_TOP_Y],
  [NEGATIVE_FALL_X + NEGATIVE_FANOUT_Y - NEGATIVE_TOP_Y, NEGATIVE_FANOUT_Y],
  [1055 - FANOUT_RUN, NEGATIVE_FANOUT_Y],
  [1055, NEGATIVE_PAD_Y],
  [LOAD_X, NEGATIVE_PAD_Y],
])

const VIA_PATH = [
  { x: 11, y: -0.825 },
  { x: 11, y: -0.825, via: true, toLayer: "bottom" },
  { x: 11, y: -0.825 },
  { x: 13, y: -0.825 },
  { x: 13, y: -0.825, via: true, toLayer: "top" },
  { x: 13, y: -0.825 },
] as const

function Termination({
  name,
  x,
  topY,
  topPin,
}: {
  name: string
  x: number
  topY: number
  topPin: 1 | 2
}): ReactElement {
  const at = pcbPoint(x, topY + (1.65 * PIXELS_PER_MM) / 2)
  return (
    <chip
      name={name}
      pcbX={at.x}
      pcbY={at.y}
      schX={at.x}
      schY={at.y}
      footprint={
        <footprint>
          <smtpad
            shape="rect"
            width={0.95}
            height={0.8}
            cornerRadius={0.2}
            pcbX={0}
            pcbY={0.825}
            portHints={[`pin${topPin}`]}
          />
          <smtpad
            shape="rect"
            width={0.95}
            height={0.8}
            cornerRadius={0.2}
            pcbX={0}
            pcbY={-0.825}
            portHints={[`pin${3 - topPin}`]}
          />
        </footprint>
      }
    />
  )
}

/**
 * Recreates the visible copper in JamesJ's phase skew video, KiCad forum
 * topic 66611 post 13. Select one pair at a time as in the video. KiCad can
 * select two arbitrary traces; the viewer needs pair metadata to show them.
 */
export function ForumExampleBoard({
  activePair = "differential",
}: { activePair?: ForumPair } = {}): ReactElement {
  return (
    <board
      width={FORUM_BOARD_WIDTH_MM}
      height={FORUM_BOARD_HEIGHT_MM}
      thickness={1.6}
      layers={2}
      pcbStyle={{ viaPadDiameter: 0.6, viaHoleDiameter: 0.3 }}
      routeRemaining={false}
    >
      <Termination name="R1" x={SOURCE_X} topY={POSITIVE_PAD_Y} topPin={1} />
      <Termination name="R2" x={LOAD_X} topY={POSITIVE_PAD_Y} topPin={1} />
      <Termination
        name="R3"
        x={SOURCE_X}
        topY={UPPER_STRAIGHT_PAD_Y}
        topPin={2}
      />
      <Termination
        name="R4"
        x={LOAD_X}
        topY={UPPER_STRAIGHT_PAD_Y}
        topPin={2}
      />
      <trace
        name="TRACE_P"
        from=".R1 > .pin1"
        to=".R2 > .pin1"
        thickness={TRACE_WIDTH_MM}
        pcbPath={POSITIVE_PATH}
      />
      <trace
        name="TRACE_N"
        from=".R1 > .pin2"
        to=".R2 > .pin2"
        thickness={TRACE_WIDTH_MM}
        pcbPath={NEGATIVE_PATH}
      />
      <trace
        name="TRACE3"
        from=".R3 > .pin2"
        to=".R4 > .pin2"
        thickness={TRACE_WIDTH_MM}
        pcbPath={[]}
      />
      <trace
        name="TRACE2"
        from=".R3 > .pin1"
        to=".R4 > .pin1"
        thickness={TRACE_WIDTH_MM}
        pcbPath={[...VIA_PATH]}
      />
      {activePair === "differential" ? (
        <differentialpair
          name="TRACE"
          positiveConnection="TRACE_P"
          negativeConnection="TRACE_N"
          pcbTraceGap={0.25}
        />
      ) : (
        <differentialpair
          name="ARBITRARY"
          positiveConnection="TRACE2"
          negativeConnection="TRACE3"
          pcbTraceGap={1.45}
        />
      )}
    </board>
  )
}

export function renderForumExampleBoard(
  activePair: ForumPair = "differential",
): CircuitJson {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(<ForumExampleBoard activePair={activePair} />)
  return circuit.getCircuitJson() as CircuitJson
}
