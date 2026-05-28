import { lineAlphabet as defaultLineAlphabet } from "@tscircuit/alphabet"
import type { NinePointAnchor } from "circuit-json"

/**
 * W15.P4 (EnergyCitizen fork): accept an optional `lineAlphabet`
 * argument so callers can supply a non-default font (e.g. Ubuntu
 * lineAlphabet via getFont("ubuntu")). Default kept as the
 * tscircuit2024 alphabet for backward compatibility.
 */
type FontLineAlphabet = Record<
  string,
  Array<{ x1: number; y1: number; x2: number; y2: number }>
>

interface AlphabetLineSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface PathSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface AlphabetTextBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface PcbAlphabetTextGeometry {
  pathData: string
  bounds: AlphabetTextBounds | null
}

export interface CreatePcbAlphabetTextGeometryParams {
  text: string
  anchorAlignment: NinePointAnchor
  fontSize: number
  charAdvance: number
  spaceAdvance: number
  trailingSpacing: number
  lineHeight: number
  /** Glyph stroke lookup. Defaults to tscircuit2024. */
  lineAlphabet?: FontLineAlphabet
  mapSegment: (
    segment: AlphabetLineSegment,
    offsetX: number,
    offsetY: number,
    fontSize: number,
  ) => PathSegment
}

export function createPcbAlphabetTextGeometry(
  params: CreatePcbAlphabetTextGeometryParams,
): PcbAlphabetTextGeometry {
  const {
    text,
    anchorAlignment,
    fontSize,
    charAdvance,
    spaceAdvance,
    trailingSpacing,
    lineHeight,
    lineAlphabet = defaultLineAlphabet,
    mapSegment,
  } = params

  const textLines = text.split("\n")
  const totalHeight = textLines.length * lineHeight
  const lineWidths = textLines.map((line) =>
    getLineWidth(line, charAdvance, spaceAdvance, trailingSpacing),
  )

  const baseSegments: PathSegment[] = []
  let y = -totalHeight / 2

  for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
    const line = textLines[lineIndex] ?? ""
    const lineWidth = lineWidths[lineIndex] ?? 0
    let x = -lineWidth / 2

    for (const char of line) {
      if (char === " ") {
        x += spaceAdvance
        continue
      }

      const charLines = lineAlphabet[char]
      if (charLines) {
        for (const segment of charLines) {
          baseSegments.push(mapSegment(segment, x, y, fontSize))
        }
      }

      x += charAdvance
    }

    y += lineHeight
  }

  const baseBounds = getSegmentBounds(baseSegments)
  if (!baseBounds) {
    return { pathData: "", bounds: null }
  }

  const anchorOffset = getAnchorOffsetForBounds(anchorAlignment, baseBounds)
  const anchoredSegments = translateSegments(baseSegments, anchorOffset)
  const anchoredBounds = translateBounds(baseBounds, anchorOffset)

  return {
    pathData: segmentsToPathData(anchoredSegments),
    bounds: anchoredBounds,
  }
}

function getLineWidth(
  line: string,
  charAdvance: number,
  spaceAdvance: number,
  trailingSpacing: number,
): number {
  let width = 0

  for (const char of line) {
    width += char === " " ? spaceAdvance : charAdvance
  }

  return width > 0 ? width - trailingSpacing : 0
}

function getSegmentBounds(segments: PathSegment[]): AlphabetTextBounds | null {
  if (segments.length === 0) return null

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const segment of segments) {
    minX = Math.min(minX, segment.x1, segment.x2)
    minY = Math.min(minY, segment.y1, segment.y2)
    maxX = Math.max(maxX, segment.x1, segment.x2)
    maxY = Math.max(maxY, segment.y1, segment.y2)
  }

  return { minX, minY, maxX, maxY }
}

export function getAnchorOffsetForBounds(
  anchorAlignment: NinePointAnchor,
  bounds: AlphabetTextBounds,
): { x: number; y: number } {
  return {
    x: -getHorizontalAnchorPosition(anchorAlignment, bounds),
    y: -getVerticalAnchorPosition(anchorAlignment, bounds),
  }
}

function getHorizontalAnchorPosition(
  anchorAlignment: NinePointAnchor,
  bounds: Pick<AlphabetTextBounds, "minX" | "maxX">,
): number {
  if (
    anchorAlignment === "top_left" ||
    anchorAlignment === "center_left" ||
    anchorAlignment === "bottom_left"
  ) {
    return bounds.minX
  }

  if (
    anchorAlignment === "top_right" ||
    anchorAlignment === "center_right" ||
    anchorAlignment === "bottom_right"
  ) {
    return bounds.maxX
  }

  return (bounds.minX + bounds.maxX) / 2
}

function getVerticalAnchorPosition(
  anchorAlignment: NinePointAnchor,
  bounds: Pick<AlphabetTextBounds, "minY" | "maxY">,
): number {
  if (
    anchorAlignment === "top_left" ||
    anchorAlignment === "top_center" ||
    anchorAlignment === "top_right"
  ) {
    return bounds.minY
  }

  if (
    anchorAlignment === "bottom_left" ||
    anchorAlignment === "bottom_center" ||
    anchorAlignment === "bottom_right"
  ) {
    return bounds.maxY
  }

  return (bounds.minY + bounds.maxY) / 2
}

function translateSegments(
  segments: PathSegment[],
  offset: { x: number; y: number },
): PathSegment[] {
  if (offset.x === 0 && offset.y === 0) {
    return segments
  }

  return segments.map((segment) => ({
    x1: segment.x1 + offset.x,
    y1: segment.y1 + offset.y,
    x2: segment.x2 + offset.x,
    y2: segment.y2 + offset.y,
  }))
}

function translateBounds(
  bounds: AlphabetTextBounds,
  offset: { x: number; y: number },
): AlphabetTextBounds {
  return {
    minX: bounds.minX + offset.x,
    minY: bounds.minY + offset.y,
    maxX: bounds.maxX + offset.x,
    maxY: bounds.maxY + offset.y,
  }
}

function segmentsToPathData(segments: PathSegment[]): string {
  return segments
    .map(
      (segment) => `M${segment.x1} ${segment.y1}L${segment.x2} ${segment.y2}`,
    )
    .join(" ")
}
