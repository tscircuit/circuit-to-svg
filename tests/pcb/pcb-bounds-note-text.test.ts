import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  PcbFabricationNoteText,
  PcbNoteText,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// pcb_note_text is rendered, but getComprehensivePcbBounds currently ignores
// it entirely, so a viewport can collapse around unrelated geometry and clip
// the note text off-screen.
const noteText: PcbNoteText = {
  type: "pcb_note_text",
  pcb_note_text_id: "note_text_0",
  layer: "top",
  text: "CENTER NOTE",
  font: "tscircuit2024",
  font_size: 2,
  anchor_position: { x: 20, y: 10 },
  anchor_alignment: "center",
  color: "rgba(255, 220, 180, 0.9)",
}

const noteTextOnly: AnyCircuitElement[] = [noteText]

// pcb_fabrication_note_text has the same omission, so fabrication overlays can
// be clipped even though the text itself renders.
const fabricationNoteText: PcbFabricationNoteText = {
  type: "pcb_fabrication_note_text",
  pcb_fabrication_note_text_id: "fab_note_text_0",
  pcb_component_id: "pcb_component_0",
  font: "tscircuit2024",
  layer: "top",
  text: "FAB NOTE",
  font_size: 2,
  anchor_position: { x: 20, y: 10 },
  anchor_alignment: "center",
  color: "rgba(255,255,255,0.5)",
}

const fabricationNoteTextOnly: AnyCircuitElement[] = [fabricationNoteText]

test("getComprehensivePcbBounds includes pcb_note_text extents", () => {
  const bounds = getComprehensivePcbBounds(noteTextOnly)

  expect(bounds.minX).toBeLessThan(20)
  expect(bounds.maxX).toBeGreaterThan(20)
  expect(bounds.minY).toBeLessThan(10)
  expect(bounds.maxY).toBeGreaterThan(10)
})

test("getComprehensivePcbBounds includes pcb_fabrication_note_text extents", () => {
  const bounds = getComprehensivePcbBounds(fabricationNoteTextOnly)

  expect(bounds.minX).toBeLessThan(20)
  expect(bounds.maxX).toBeGreaterThan(20)
  expect(bounds.minY).toBeLessThan(10)
  expect(bounds.maxY).toBeGreaterThan(10)
})

test("pcb_note_text svg viewport snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg(noteTextOnly)

  expect(svg).toMatchSvgSnapshot(import.meta.path + ".note-text")
})

test("pcb_fabrication_note_text svg viewport snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg(fabricationNoteTextOnly)

  expect(svg).toMatchSvgSnapshot(import.meta.path + ".fabrication-note-text")
})
