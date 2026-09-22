import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const board: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
]

const silkscreen: CircuitJson = ["top", "bottom"].map((layer) => ({
  type: "pcb_silkscreen_path",
  pcb_silkscreen_path_id: `silkscreen_${layer}`,
  layer,
  route: [
    { x: -4, y: -4 },
    { x: 4, y: -4 },
  ],
  stroke_width: 0.5,
})) as CircuitJson

const fabricationNotes: CircuitJson = ["top", "bottom"].flatMap((layer) => [
  {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: `text_${layer}`,
    layer,
    text: "FAB",
    font: "tscircuit2024",
    font_size: 2,
    anchor_position: { x: 0, y: 0 },
    anchor_alignment: "center",
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: `path_${layer}`,
    layer,
    route: [
      { x: -5, y: 3 },
      { x: 5, y: 3 },
    ],
    stroke_width: 0.5,
  },
  {
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: `rect_${layer}`,
    layer,
    center: { x: 0, y: 0 },
    width: 12,
    height: 12,
    stroke_width: 0.5,
  },
  {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: `dimension_${layer}`,
    layer,
    from: { x: -5, y: 6 },
    to: { x: 5, y: 6 },
    font_size: 1,
    arrow_size: 0.5,
  },
]) as CircuitJson

const pcbNote: CircuitJson = [
  {
    type: "pcb_note_text",
    pcb_note_text_id: "note",
    layer: "top",
    text: "PCB NOTE",
    font: "tscircuit2024",
    font_size: 1,
    anchor_position: { x: 0, y: -6 },
    anchor_alignment: "center",
  },
]

for (const layer of ["top", "bottom"] as const) {
  test(`showFabricationNotes hides all fabrication primitives on ${layer}`, () => {
    const circuit = [...board, ...silkscreen, ...pcbNote, ...fabricationNotes]
    const options = { layer, includeVersion: false }
    const visible = convertCircuitJsonToPcbSvg(circuit, options)
    expect(
      convertCircuitJsonToPcbSvg(circuit, {
        ...options,
        showFabricationNotes: true,
      }),
    ).toBe(visible)
    for (const type of ["text", "path", "rect", "dimension"]) {
      expect(visible).toContain(`data-type="pcb_fabrication_note_${type}"`)
    }
    const hidden = convertCircuitJsonToPcbSvg(circuit, {
      ...options,
      showFabricationNotes: false,
    })
    expect(hidden).not.toContain('data-type="pcb_fabrication_note_')
    expect(hidden).toContain('data-type="pcb_silkscreen_path"')
    expect(hidden).toBe(
      convertCircuitJsonToPcbSvg(
        [...board, ...silkscreen, ...pcbNote],
        options,
      ),
    )
    expect(convertCircuitJsonToPcbSvg(circuit, options)).toBe(visible)
  })
}

test("fabrication note paths respect the rendered layer", () => {
  const circuit = [...board, ...fabricationNotes]
  const bottom = convertCircuitJsonToPcbSvg(circuit, {
    layer: "bottom",
    includeVersion: false,
  })
  expect(bottom).toContain('data-pcb-fabrication-note-path-id="path_bottom"')
  expect(bottom).not.toContain('data-pcb-fabrication-note-path-id="path_top"')
  const top = convertCircuitJsonToPcbSvg(circuit, {
    layer: "top",
    includeVersion: false,
  })
  expect(top).toContain('data-pcb-fabrication-note-path-id="path_top"')
  expect(top).not.toContain('data-pcb-fabrication-note-path-id="path_bottom"')
})

test("fabrication visibility is independent of PCB note visibility", () => {
  const circuit = [...board, ...pcbNote, ...fabricationNotes]
  const hiddenFab = convertCircuitJsonToPcbSvg(circuit, {
    showFabricationNotes: false,
  })
  expect(hiddenFab).toContain('data-type="pcb_note_text"')
  const hiddenPcb = convertCircuitJsonToPcbSvg(circuit, { showPcbNotes: false })
  expect(hiddenPcb).not.toContain('data-type="pcb_note_text"')
  expect(hiddenPcb).toContain('data-type="pcb_fabrication_note_text"')
})

test("hidden fabrication notes do not expand SVG bounds", () => {
  const outsideNote = {
    ...fabricationNotes[0],
    anchor_position: { x: 100, y: 100 },
  }
  const options = { includeVersion: false, matchBoardAspectRatio: true }
  const baseline = convertCircuitJsonToPcbSvg(board, options)
  const circuit = [...board, outsideNote] as CircuitJson
  expect(convertCircuitJsonToPcbSvg(circuit, options)).not.toBe(baseline)
  expect(
    convertCircuitJsonToPcbSvg(circuit, {
      ...options,
      showFabricationNotes: false,
    }),
  ).toBe(baseline)
})
