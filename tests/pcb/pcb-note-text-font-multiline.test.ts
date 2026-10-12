import { expect, test } from "bun:test"
import type { PcbNoteText } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync } from "svgson"

test("multiline pcb notes retain alignment and color with the alphabet font", async () => {
  const notes: PcbNoteText[] = [
    {
      type: "pcb_note_text",
      pcb_note_text_id: "left",
      layer: "top",
      font: "tscircuit2024",
      font_size: 1,
      anchor_position: { x: -18, y: 2 },
      anchor_alignment: "top_left",
      text: "Board A\ntop = TENTED\nbottom = exposed",
      color: "white",
    },
    {
      type: "pcb_note_text",
      pcb_note_text_id: "center",
      layer: "top",
      font: "tscircuit2024",
      font_size: 1,
      anchor_position: { x: 0, y: 2 },
      anchor_alignment: "center",
      text: "Board B\ntop = exposed\nbottom = TENTED",
      color: "#00ffff",
    },
    {
      type: "pcb_note_text",
      pcb_note_text_id: "right",
      layer: "top",
      font: "tscircuit2024",
      font_size: 1,
      anchor_position: { x: 18, y: 2 },
      anchor_alignment: "top_right",
      text: "Via overrides\ntop = false\nbottom = true",
    },
  ]
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
    ...notes,
  ])
  const noteElements = parseSync(svg).children.filter(
    (node) => node.attributes["data-type"] === "pcb_note_text",
  )

  expect(noteElements.map((node) => node.attributes["text-anchor"])).toEqual([
    "start",
    "middle",
    "end",
  ])
  for (const node of noteElements) {
    expect(node.attributes["font-family"]).toBe("TscircuitAlphabet")
    expect(node.children.map((child) => child.name)).toEqual([
      "tspan",
      "tspan",
      "tspan",
    ])
  }
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
