import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { glyphAdvanceRatio, spaceWidthRatio } from "@tscircuit/alphabet"
import { getComprehensivePcbBounds } from "../../lib/pcb/get-pcb-bounds-from-circuit-json"

const board: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 10.4,
    height: 10.4,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
]

const text = "SN74LVC1G17DCKR v1.0"
const fontSize = 0.8

const silkscreenText: CircuitJson = [
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "st1",
    pcb_component_id: "c1",
    layer: "top",
    text,
    font: "tscircuit2024",
    font_size: fontSize,
    anchor_position: { x: 0, y: 0 },
    anchor_alignment: "center",
  },
] as CircuitJson

const expectedTextWidth =
  Array.from(text).reduce(
    (w, ch) =>
      w + (ch === " " ? spaceWidthRatio : (glyphAdvanceRatio[ch] ?? 0)),
    0,
  ) * fontSize

test("silkscreen text contributes its real font-metric extent to bounds", () => {
  const bounds = getComprehensivePcbBounds([...board, ...silkscreenText])

  // The text is wider than the nominal length*0.6 estimate and overhangs the
  // 10.4mm board; the bounds must include the overhang instead of treating
  // the text as a zero-size point.
  expect(bounds.minX).toBeLessThanOrEqual(-expectedTextWidth / 2 + 1e-4)
  expect(bounds.maxX).toBeGreaterThanOrEqual(expectedTextWidth / 2 - 1e-4)
  expect(bounds.maxX - bounds.minX).toBeCloseTo(expectedTextWidth, 3)
})

test("anchored silkscreen text offsets bounds from anchor position", () => {
  const topLeft: CircuitJson = [
    {
      ...silkscreenText[0],
      anchor_alignment: "top_left",
      anchor_position: { x: 10, y: 10 },
    },
  ] as CircuitJson

  const bounds = getComprehensivePcbBounds(topLeft)
  // top_left anchor: the renderer places the anchor at the text's top edge
  // (dominant-baseline="text-before-edge"), so the box extends right and down
  expect(bounds.minX).toBeCloseTo(10, 3)
  expect(bounds.maxX).toBeCloseTo(10 + expectedTextWidth, 3)
  expect(bounds.maxY).toBeCloseTo(10, 3)
  expect(bounds.minY).toBeCloseTo(10 - fontSize, 3)
})

test("knockout silkscreen text includes padding in bounds", () => {
  const knockout: CircuitJson = [
    {
      ...silkscreenText[0],
      is_knockout: true,
      knockout_padding: { left: 1, right: 1, top: 0.5, bottom: 0.5 },
    },
  ] as CircuitJson

  const bounds = getComprehensivePcbBounds(knockout)
  expect(bounds.maxX - bounds.minX).toBeCloseTo(expectedTextWidth + 2, 3)
  expect(bounds.maxY - bounds.minY).toBeCloseTo(fontSize + 1, 3)
})
