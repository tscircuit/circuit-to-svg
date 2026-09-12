import { lineAlphabet } from "@tscircuit/alphabet"
import type { INode } from "svgson"
import { ALPHABET_FONT_FAMILY } from "lib/utils/stringify-svg"
import type { AlphabetTextBounds } from "./create-pcb-alphabet-text-geometry"

// Metrics used by @tscircuit/alphabet's scripts/build-font.ts. Glyphs retain
// their original x coordinates, use a fixed advance, and scale y by 940/1000.
const ASCENDER = 0.94
const STROKE_RADIUS = 0.09 / 2
const glyphBounds = Object.fromEntries(
  Object.entries(lineAlphabet).map(([char, segments]) => {
    const xs = segments.flatMap((s) => [s.x1, s.x2])
    const ys = segments.flatMap((s) => [s.y1, s.y2])
    return [
      char,
      segments.length
        ? {
            minX: Math.min(...xs) - STROKE_RADIUS,
            maxX: Math.max(...xs) + STROKE_RADIUS,
            minY: -(Math.max(...ys) + STROKE_RADIUS) * ASCENDER,
            maxY: -(Math.min(...ys) - STROKE_RADIUS) * ASCENDER,
          }
        : null,
    ]
  }),
)
const CHAR_ADVANCE =
  Math.round(
    Math.max(
      ...Object.values(glyphBounds).map((b) => (b ? b.maxX - b.minX : 0)),
    ) * 1000,
  ) / 1000

/** Measure the font's ink for the knockout rectangle; render real SVG text. */
export function createAlphabetKnockoutText(
  text: string,
  fontSize: number,
): {
  bounds: AlphabetTextBounds | null
  textNode: INode
} {
  let bounds: AlphabetTextBounds | null = null
  const lines = text.split("\n")
  const children: INode[] = lines.map((line, index) => {
    const chars = Array.from(line)
    const x = -(chars.length * CHAR_ADVANCE * fontSize) / 2
    const y = index * fontSize * 1.1
    chars.forEach((char, charIndex) => {
      const glyph = glyphBounds[char]
      if (!glyph) return
      const offset = x + charIndex * CHAR_ADVANCE * fontSize
      const ink = {
        minX: offset + glyph.minX * fontSize,
        maxX: offset + glyph.maxX * fontSize,
        minY: y + glyph.minY * fontSize,
        maxY: y + glyph.maxY * fontSize,
      }
      bounds = bounds
        ? {
            minX: Math.min(bounds.minX, ink.minX),
            maxX: Math.max(bounds.maxX, ink.maxX),
            minY: Math.min(bounds.minY, ink.minY),
            maxY: Math.max(bounds.maxY, ink.maxY),
          }
        : ink
    })
    return {
      name: "tspan",
      type: "element",
      value: "",
      attributes: { x: x.toString(), y: y.toString() },
      children: [
        { name: "", type: "text", value: line, attributes: {}, children: [] },
      ],
    }
  })
  return {
    bounds,
    textNode: {
      name: "text",
      type: "element",
      value: "",
      attributes: {
        "font-family": ALPHABET_FONT_FAMILY,
        "font-size": fontSize.toString(),
        "text-anchor": "start",
        "dominant-baseline": "alphabetic",
        "xml:space": "preserve",
        fill: "black",
        stroke: "none",
      },
      children,
    },
  }
}
