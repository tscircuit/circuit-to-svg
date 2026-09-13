import { expect, test } from "bun:test"
import type { PcbNoteText } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { viaTentingCircuit } from "./pcb-via-tenting.fixture"

const viewLabel: Omit<PcbNoteText, "text"> = {
  type: "pcb_note_text",
  pcb_note_text_id: "view_label",
  anchor_position: { x: 0, y: 6 },
  anchor_alignment: "center",
  layer: "top",
  font: "tscircuit2024",
  font_size: 1,
  color: "#ffffff",
}

test("top soldermask snapshot shows top-only and both-side tenting", () => {
  const svg = convertCircuitJsonToPcbSvg(
    [
      ...viaTentingCircuit,
      { ...viewLabel, text: "TOP VIEW - Soldermask enabled" },
    ],
    { layer: "top", showSolderMask: true, width: 1200, height: 320 },
  )
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-via-tenting-top-soldermask",
  )
})

test("bottom soldermask snapshot shows bottom-only and both-side tenting", () => {
  const svg = convertCircuitJsonToPcbSvg(
    [
      ...viaTentingCircuit,
      { ...viewLabel, text: "BOTTOM VIEW - Soldermask enabled" },
    ],
    { layer: "bottom", showSolderMask: true, width: 1200, height: 320 },
  )
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-via-tenting-bottom-soldermask",
  )
})

test("top copper snapshot keeps every via drill visible", () => {
  const svg = convertCircuitJsonToPcbSvg(
    [...viaTentingCircuit, { ...viewLabel, text: "TOP VIEW - Copper only" }],
    { layer: "top", showSolderMask: false, width: 1200, height: 320 },
  )
  expect(svg).toMatchSvgSnapshot(import.meta.path, "pcb-via-tenting-top-copper")
})

test("bottom copper snapshot keeps every via drill visible", () => {
  const svg = convertCircuitJsonToPcbSvg(
    [...viaTentingCircuit, { ...viewLabel, text: "BOTTOM VIEW - Copper only" }],
    { layer: "bottom", showSolderMask: false, width: 1200, height: 320 },
  )
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-via-tenting-bottom-copper",
  )
})
