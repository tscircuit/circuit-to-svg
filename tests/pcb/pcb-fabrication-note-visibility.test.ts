import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

// Repro: https://github.com/tscircuit/circuit-json-to-gltf/issues/199
// These snapshots intentionally capture the CURRENT BUG, without a renderer fix:
// - showPcbNotes:false still draws fabrication annotations on the top face.
// - The top-only fabrication path also appears on the bottom face.
// Expected after a fix: hidden fabrication notes disappear, and top-only
// annotations never appear on the bottom. Update these snapshots with that fix.
const board = {
  type: "pcb_board" as const,
  pcb_board_id: "board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4" as const,
}

const fabricationNotes = [
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "fab_path_0",
    pcb_component_id: "component_0",
    layer: "top",
    route: [
      { x: 1, y: 1 },
      { x: 3, y: 2 },
      { x: 2, y: 3 },
    ],
    stroke_width: 0.2,
  },
  {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "fab_text_0",
    pcb_component_id: "component_0",
    layer: "top",
    text: "Fabrication only",
    anchor_position: { x: -4, y: 4 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 1,
  },
  {
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: "fab_rect_0",
    pcb_component_id: "component_0",
    layer: "top",
    center: { x: -3, y: -3 },
    width: 2,
    height: 2,
    stroke_width: 0.2,
    has_stroke: true,
    is_filled: false,
  },
  {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "fab_dimension_0",
    pcb_component_id: "component_0",
    layer: "top",
    from: { x: 1, y: -4 },
    to: { x: 4, y: -4 },
    text: "3 mm",
    font: "tscircuit2024",
    font_size: 1,
    arrow_size: 0.5,
  },
] satisfies CircuitJson

test("repro: top layer shows fabrication note path and hide user note when showPcbNotes=false", async () => {
  const circuitJson: CircuitJson = [
    board,
    ...fabricationNotes,
    {
      type: "pcb_note_text",
      pcb_note_text_id: "user_note_0",
      layer: "top",
      text: "User note",
      anchor_position: { x: 0, y: -1 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 1,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "physical_silkscreen",
      pcb_component_id: "component_0",
      layer: "top",
      text: "TOP SILK",
      anchor_position: { x: 0, y: 7 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 1,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "physical_pad",
      pcb_component_id: "component_0",
      layer: "top",
      shape: "rect",
      x: 5,
      y: -7,
      width: 2,
      height: 1,
    },
  ]
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "top",
    showPcbNotes: false,
    drawPaddingOutsideBoard: false,
    backgroundColor: "#0f3812",
    width: 600,
    height: 600,
  })

  // Repro: toggling showPcbNotes off hides user notes, but fabrication notes
  // still render on top here.
  expect(svg.includes('data-type="pcb_note_text"')).toBe(false)
  expect(svg).toContain('data-type="pcb_silkscreen_text"')
  expect(svg).toContain('data-type="pcb_smtpad"')
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-fabrication-note-visibility-top-show-pcb-notes-false",
  )
})

test("repro: top layer shows fabrication note path and user note when showPcbNotes=true", async () => {
  const circuitJson: CircuitJson = [
    board,
    ...fabricationNotes,
    {
      type: "pcb_note_text",
      pcb_note_text_id: "user_note_0",
      layer: "top",
      text: "User note",
      anchor_position: { x: 0, y: -1 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 1,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "physical_silkscreen",
      pcb_component_id: "component_0",
      layer: "top",
      text: "TOP SILK",
      anchor_position: { x: 0, y: 7 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 1,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "physical_pad",
      pcb_component_id: "component_0",
      layer: "top",
      shape: "rect",
      x: 5,
      y: -7,
      width: 2,
      height: 1,
    },
  ]
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "top",
    showPcbNotes: true,
    drawPaddingOutsideBoard: false,
    backgroundColor: "#0f3812",
    width: 600,
    height: 600,
  })

  // Repro: with showPcbNotes=true, user notes render as expected plus current
  // top fabrication leak behavior.
  expect(svg.includes('data-type="pcb_note_text"')).toBe(true)
  expect(svg).toContain('data-type="pcb_silkscreen_text"')
  expect(svg).toContain('data-type="pcb_smtpad"')
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-fabrication-note-visibility-top-show-pcb-notes-true",
  )
})

test("repro: bottom layer renders top fabrication note due to current bug with showPcbNotes=false", async () => {
  const circuitJson: CircuitJson = [
    board,
    ...fabricationNotes,
    {
      type: "pcb_note_text",
      pcb_note_text_id: "user_note_0",
      layer: "bottom",
      text: "User note",
      anchor_position: { x: 0, y: -1 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 1,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "physical_silkscreen",
      pcb_component_id: "component_0",
      layer: "bottom",
      text: "BOTTOM SILK",
      anchor_position: { x: 0, y: 7 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 1,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "physical_pad",
      pcb_component_id: "component_0",
      layer: "bottom",
      shape: "rect",
      x: 5,
      y: -7,
      width: 2,
      height: 1,
    },
  ]
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "bottom",
    showPcbNotes: false,
    drawPaddingOutsideBoard: false,
    backgroundColor: "#0f3812",
    width: 600,
    height: 600,
  })

  // Repro: bottom rendering should not include top-only fabrication path, but it
  // still does; this pinpoints the side-leak.
  expect(svg.includes('data-type="pcb_note_text"')).toBe(false)
  expect(svg).toContain('data-type="pcb_silkscreen_text"')
  expect(svg).toContain('data-type="pcb_smtpad"')
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-fabrication-note-visibility-bottom-show-pcb-notes-false",
  )
})

test("repro: bottom layer renders top fabrication note even with showPcbNotes=true", async () => {
  const circuitJson: CircuitJson = [
    board,
    ...fabricationNotes,
    {
      type: "pcb_note_text",
      pcb_note_text_id: "user_note_0",
      layer: "bottom",
      text: "User note",
      anchor_position: { x: 0, y: -1 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 1,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "physical_silkscreen",
      pcb_component_id: "component_0",
      layer: "bottom",
      text: "BOTTOM SILK",
      anchor_position: { x: 0, y: 7 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 1,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "physical_pad",
      pcb_component_id: "component_0",
      layer: "bottom",
      shape: "rect",
      x: 5,
      y: -7,
      width: 2,
      height: 1,
    },
  ]
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "bottom",
    showPcbNotes: true,
    drawPaddingOutsideBoard: false,
    backgroundColor: "#0f3812",
    width: 600,
    height: 600,
  })

  // Repro: user note control toggles on this layer, but fabrication side leakage
  // remains unchanged.
  expect(svg.includes('data-type="pcb_note_text"')).toBe(true)
  expect(svg).toContain('data-type="pcb_silkscreen_text"')
  expect(svg).toContain('data-type="pcb_smtpad"')
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-fabrication-note-visibility-bottom-show-pcb-notes-true",
  )
})
