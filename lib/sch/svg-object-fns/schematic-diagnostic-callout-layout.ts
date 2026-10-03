export interface ScreenBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface CalloutPlacement extends ScreenBounds {
  side: "top" | "bottom" | "left" | "right"
}

const TARGET_PADDING = 6
const CALLOUT_GAP = 12
const VIEWPORT_PADDING = 12
const CALLOUT_PADDING = 6
const LINE_HEIGHT = 14
const MESSAGE_FONT_SIZE = 11
const MAX_CALLOUT_WIDTH = 280
const MIN_CALLOUT_WIDTH = 140

/** Callout bounds, leader endpoints, and dimensions use SVG screen pixels (+X right, +Y down). */
export function getSchematicDiagnosticCalloutLayout({
  message,
  targetBounds,
  svgWidth,
  svgHeight,
  occupiedCalloutBounds,
}: {
  message: string
  targetBounds: ScreenBounds
  svgWidth: number
  svgHeight: number
  occupiedCalloutBounds: ScreenBounds[]
}) {
  const availableCalloutWidth = Math.max(1, svgWidth - VIEWPORT_PADDING * 2)
  const messageLines = wrapText(
    message,
    Math.max(
      12,
      Math.floor(
        (Math.min(MAX_CALLOUT_WIDTH, availableCalloutWidth) -
          CALLOUT_PADDING * 2) /
          (MESSAGE_FONT_SIZE * 0.56),
      ),
    ),
  )
  const longestLineLength = Math.max(...messageLines.map((line) => line.length))
  const calloutWidth = Math.min(
    MAX_CALLOUT_WIDTH,
    availableCalloutWidth,
    Math.max(
      Math.min(MIN_CALLOUT_WIDTH, availableCalloutWidth),
      longestLineLength * MESSAGE_FONT_SIZE * 0.56 + CALLOUT_PADDING * 2,
    ),
  )
  const calloutHeight = CALLOUT_PADDING * 2 + messageLines.length * LINE_HEIGHT
  const placement = placeCallout({
    targetBounds,
    calloutWidth,
    calloutHeight,
    svgWidth,
    svgHeight,
    occupiedCalloutBounds,
  })
  occupiedCalloutBounds.push(placement)
  const targetOutline = expandBounds(targetBounds, TARGET_PADDING)
  const leader = getLeaderEndpoints(placement, targetOutline)

  return {
    messageLines,
    calloutWidth,
    calloutHeight,
    placement,
    targetOutline,
    leader,
  }
}

function placeCallout({
  targetBounds,
  calloutWidth,
  calloutHeight,
  svgWidth,
  svgHeight,
  occupiedCalloutBounds,
}: {
  targetBounds: ScreenBounds
  calloutWidth: number
  calloutHeight: number
  svgWidth: number
  svgHeight: number
  occupiedCalloutBounds: ScreenBounds[]
}): CalloutPlacement {
  const targetCenterX = (targetBounds.minX + targetBounds.maxX) / 2
  const targetCenterY = (targetBounds.minY + targetBounds.maxY) / 2
  const topY = targetBounds.minY - TARGET_PADDING - CALLOUT_GAP - calloutHeight
  const bottomY = targetBounds.maxY + TARGET_PADDING + CALLOUT_GAP
  const leftX = targetBounds.minX - TARGET_PADDING - CALLOUT_GAP - calloutWidth
  const rightX = targetBounds.maxX + TARGET_PADDING + CALLOUT_GAP

  const candidates: CalloutPlacement[] = []

  if (topY >= VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: clamp(
          targetCenterX - calloutWidth / 2,
          VIEWPORT_PADDING,
          svgWidth - VIEWPORT_PADDING - calloutWidth,
        ),
        y: topY,
        width: calloutWidth,
        height: calloutHeight,
        side: "top",
      }),
    )
  }

  if (bottomY + calloutHeight <= svgHeight - VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: clamp(
          targetCenterX - calloutWidth / 2,
          VIEWPORT_PADDING,
          svgWidth - VIEWPORT_PADDING - calloutWidth,
        ),
        y: bottomY,
        width: calloutWidth,
        height: calloutHeight,
        side: "bottom",
      }),
    )
  }

  if (rightX + calloutWidth <= svgWidth - VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: rightX,
        y: clamp(
          targetCenterY - calloutHeight / 2,
          VIEWPORT_PADDING,
          svgHeight - VIEWPORT_PADDING - calloutHeight,
        ),
        width: calloutWidth,
        height: calloutHeight,
        side: "right",
      }),
    )
  }

  if (leftX >= VIEWPORT_PADDING) {
    candidates.push(
      makePlacement({
        x: leftX,
        y: clamp(
          targetCenterY - calloutHeight / 2,
          VIEWPORT_PADDING,
          svgHeight - VIEWPORT_PADDING - calloutHeight,
        ),
        width: calloutWidth,
        height: calloutHeight,
        side: "left",
      }),
    )
  }

  const nonOverlappingCandidate = candidates.find((candidate) =>
    occupiedCalloutBounds.every(
      (occupiedBounds) =>
        !boundsOverlap(expandBounds(candidate, 4), occupiedBounds),
    ),
  )

  if (nonOverlappingCandidate) return nonOverlappingCandidate
  if (candidates[0]) return candidates[0]

  return makePlacement({
    x: clamp(
      targetCenterX - calloutWidth / 2,
      VIEWPORT_PADDING,
      svgWidth - VIEWPORT_PADDING - calloutWidth,
    ),
    y: clamp(
      topY,
      VIEWPORT_PADDING,
      svgHeight - VIEWPORT_PADDING - calloutHeight,
    ),
    width: calloutWidth,
    height: calloutHeight,
    side: "top",
  })
}

function getLeaderEndpoints(
  placement: CalloutPlacement,
  targetBounds: ScreenBounds,
): {
  from: { x: number; y: number }
  to: { x: number; y: number }
} {
  const targetCenterX = (targetBounds.minX + targetBounds.maxX) / 2
  const targetCenterY = (targetBounds.minY + targetBounds.maxY) / 2
  const calloutCenterX = (placement.minX + placement.maxX) / 2
  const calloutCenterY = (placement.minY + placement.maxY) / 2

  switch (placement.side) {
    case "top":
      return {
        from: { x: calloutCenterX, y: placement.maxY },
        to: { x: targetCenterX, y: targetBounds.minY },
      }
    case "bottom":
      return {
        from: { x: calloutCenterX, y: placement.minY },
        to: { x: targetCenterX, y: targetBounds.maxY },
      }
    case "left":
      return {
        from: { x: placement.maxX, y: calloutCenterY },
        to: { x: targetBounds.minX, y: targetCenterY },
      }
    case "right":
      return {
        from: { x: placement.minX, y: calloutCenterY },
        to: { x: targetBounds.maxX, y: targetCenterY },
      }
  }
}

function wrapText(message: string, maxCharacters: number): string[] {
  const words = message.trim().split(/\s+/)
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (nextLine.length <= maxCharacters || currentLine.length === 0) {
      currentLine = nextLine
      continue
    }

    lines.push(currentLine)
    currentLine = word
  }

  if (currentLine) lines.push(currentLine)
  return lines.length > 0 ? lines : ["Diagnostic"]
}

function expandBounds(bounds: ScreenBounds, amount: number): ScreenBounds {
  return {
    minX: bounds.minX - amount,
    minY: bounds.minY - amount,
    maxX: bounds.maxX + amount,
    maxY: bounds.maxY + amount,
  }
}

function boundsOverlap(a: ScreenBounds, b: ScreenBounds): boolean {
  return !(
    a.maxX <= b.minX ||
    a.minX >= b.maxX ||
    a.maxY <= b.minY ||
    a.minY >= b.maxY
  )
}

function makePlacement({
  x,
  y,
  width,
  height,
  side,
}: {
  x: number
  y: number
  width: number
  height: number
  side: CalloutPlacement["side"]
}): CalloutPlacement {
  return {
    minX: x,
    minY: y,
    maxX: x + width,
    maxY: y + height,
    side,
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return (min + max) / 2
  return Math.min(Math.max(value, min), max)
}
