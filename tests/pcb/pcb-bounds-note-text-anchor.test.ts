import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  PcbFabricationNoteText,
  PcbNoteText,
} from "circuit-json"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// PCB coordinates are y-up. A "top_*" anchor renders the text with
// dominant-baseline "text-before-edge", so the text hangs BELOW the anchor
// (lower y). A "bottom_*" anchor puts the text ABOVE the anchor (higher y).
// The bounds must cover the side of the anchor where the text is drawn,
// otherwise the viewport can clip it.

const FONT_SIZE = 1
const TEXT = "ABCD"
const TEXT_WIDTH = TEXT.length * FONT_SIZE * 0.6
const TEXT_HEIGHT = FONT_SIZE

const makeNoteText = (
  anchor_alignment: PcbNoteText["anchor_alignment"],
): PcbNoteText => ({
  type: "pcb_note_text",
  pcb_note_text_id: `note_text_${anchor_alignment}`,
  layer: "top",
  text: TEXT,
  font: "tscircuit2024",
  font_size: FONT_SIZE,
  anchor_position: { x: 0, y: 0 },
  anchor_alignment,
})

const makeFabNoteText = (
  props: Partial<PcbFabricationNoteText>,
): PcbFabricationNoteText => ({
  type: "pcb_fabrication_note_text",
  pcb_fabrication_note_text_id: "fab_note_text_0",
  pcb_component_id: "pcb_component_0",
  font: "tscircuit2024",
  layer: "top",
  text: TEXT,
  font_size: FONT_SIZE,
  anchor_position: { x: 0, y: 0 },
  anchor_alignment: "center",
  ...props,
})

const getBounds = (elm: AnyCircuitElement) => getComprehensivePcbBounds([elm])

test("top_left note text bounds extend below the anchor", () => {
  const bounds = getBounds(makeNoteText("top_left"))

  expect(bounds.minX).toBeCloseTo(0)
  expect(bounds.maxX).toBeCloseTo(TEXT_WIDTH)
  expect(bounds.minY).toBeCloseTo(-TEXT_HEIGHT)
  expect(bounds.maxY).toBeCloseTo(0)
})

test("bottom_right note text bounds extend above the anchor", () => {
  const bounds = getBounds(makeNoteText("bottom_right"))

  expect(bounds.minX).toBeCloseTo(-TEXT_WIDTH)
  expect(bounds.maxX).toBeCloseTo(0)
  expect(bounds.minY).toBeCloseTo(0)
  expect(bounds.maxY).toBeCloseTo(TEXT_HEIGHT)
})

test("multiline bottom_left note text: first line above anchor, rest below", () => {
  // The first line is placed by the anchor alignment and each following line
  // is rendered one line height lower (tspan dy="1em").
  const bounds = getBounds({
    ...makeNoteText("bottom_left"),
    text: `${TEXT}\n${TEXT}\n${TEXT}`,
  })

  expect(bounds.minY).toBeCloseTo(-2 * TEXT_HEIGHT)
  expect(bounds.maxY).toBeCloseTo(TEXT_HEIGHT)
})

test("multiline top_left note text hangs entirely below the anchor", () => {
  const bounds = getBounds({
    ...makeNoteText("top_left"),
    text: `${TEXT}\n${TEXT}\n${TEXT}`,
  })

  expect(bounds.minY).toBeCloseTo(-3 * TEXT_HEIGHT)
  expect(bounds.maxY).toBeCloseTo(0)
})

test("fabrication note text without ccw_rotation is not treated as rotated", () => {
  // The SVG renderer defaults ccw_rotation to 0, so the bounds must too.
  const bounds = getBounds(makeFabNoteText({ ccw_rotation: undefined }))

  expect(bounds.maxX - bounds.minX).toBeCloseTo(TEXT_WIDTH)
  expect(bounds.maxY - bounds.minY).toBeCloseTo(TEXT_HEIGHT)
})

test("rotated fabrication note text bounds rotate around the anchor", () => {
  // The renderer rotates the text around its anchor position. Unrotated, a
  // top_left text occupies x:[0, w], y:[-h, 0]. Rotated 90deg ccw around the
  // anchor (x, y) -> (-y, x) it occupies x:[0, h], y:[0, w].
  const bounds = getBounds(
    makeFabNoteText({ anchor_alignment: "top_left", ccw_rotation: 90 }),
  )

  expect(bounds.minX).toBeCloseTo(0)
  expect(bounds.maxX).toBeCloseTo(TEXT_HEIGHT)
  expect(bounds.minY).toBeCloseTo(0)
  expect(bounds.maxY).toBeCloseTo(TEXT_WIDTH)
})
