import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// pcb_note_line uses x1/y1/x2/y2 endpoints — it has neither an `x`/`y` nor a
// `route`, so getComprehensivePcbBounds skips it entirely. The line then
// contributes nothing to the bounds and is rendered off the svg viewport.
const noteLine: AnyCircuitElement[] = [
  {
    type: "pcb_note_line",
    pcb_note_line_id: "note_line_0",
    x1: -6,
    y1: 2,
    x2: 6,
    y2: 2,
    stroke_width: 0.3,
  } as AnyCircuitElement,
]

const diamond: AnyCircuitElement[] = [
  ["a", -6, 0, 0, 6],
  ["b", 0, 6, 6, 0],
  ["c", 6, 0, 0, -6],
  ["d", 0, -6, -6, 0],
].map(
  ([id, x1, y1, x2, y2]) =>
    ({
      type: "pcb_note_line",
      pcb_note_line_id: `note_line_${id}`,
      x1,
      y1,
      x2,
      y2,
      stroke_width: 0.3,
    }) as AnyCircuitElement,
)

test("getComprehensivePcbBounds includes a pcb_note_line", () => {
  const bounds = getComprehensivePcbBounds(noteLine)
  expect(bounds.minX).toBeCloseTo(-6, 6)
  expect(bounds.maxX).toBeCloseTo(6, 6)
  expect(bounds.minY).toBeCloseTo(2, 6)
  expect(bounds.maxY).toBeCloseTo(2, 6)
})

test("note line svg viewport snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg(diamond)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
