import { expect, test } from "bun:test"
import type { PcbNoteText } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync } from "svgson"

test("pcb note text uses the embedded tscircuit2024 font", async () => {
  const text = "Board A: top = TENTED, bottom = exposed"
  const note: PcbNoteText = {
    type: "pcb_note_text",
    pcb_note_text_id: "note",
    layer: "top",
    font: "tscircuit2024",
    font_size: 1,
    anchor_position: { x: 0, y: -1.5 },
    anchor_alignment: "center",
    text,
    color: "white",
  }
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board",
      width: 40,
      height: 8,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "silkscreen",
      pcb_component_id: "component",
      layer: "top",
      font: "tscircuit2024",
      font_size: note.font_size,
      anchor_position: { x: 0, y: 1.5 },
      anchor_alignment: "center",
      text,
    },
    note,
  ])
  const noteElement = parseSync(svg).children.find(
    (node) =>
      node.attributes["data-pcb-note-text-id"] === note.pcb_note_text_id,
  )!

  expect(noteElement.attributes["font-family"]).toBe("TscircuitAlphabet")
  expect(noteElement.attributes.fill).toBe("white")
  expect(noteElement.children[0]?.value).toBe(note.text)
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
