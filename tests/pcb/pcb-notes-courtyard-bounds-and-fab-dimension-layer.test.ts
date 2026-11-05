import { expect, test } from "bun:test"
import type { AnyCircuitElement, CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib/index"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board_1",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

test("showPcbNotes: false excludes hidden pcb_note_* elements from SVG bounds", () => {
  const options = { includeVersion: false, matchBoardAspectRatio: true }
  const baseline = convertCircuitJsonToPcbSvg([board], options)

  const outsideNotes: CircuitJson = [
    board,
    {
      type: "pcb_note_text",
      pcb_note_text_id: "note_text_outside",
      layer: "top",
      text: "OUTSIDE NOTE",
      font: "tscircuit2024",
      font_size: 2,
      anchor_position: { x: 100, y: 100 },
      anchor_alignment: "center",
    },
    {
      type: "pcb_note_rect",
      pcb_note_rect_id: "note_rect_outside",
      layer: "top",
      center: { x: -100, y: -100 },
      width: 10,
      height: 10,
      stroke_width: 0.2,
    },
    {
      type: "pcb_note_line",
      pcb_note_line_id: "note_line_outside",
      layer: "top",
      x1: 80,
      y1: 80,
      x2: 120,
      y2: 120,
      stroke_width: 0.2,
    },
    {
      type: "pcb_note_path",
      pcb_note_path_id: "note_path_outside",
      layer: "top",
      route: [
        { x: -80, y: 80 },
        { x: -120, y: 120 },
      ],
      stroke_width: 0.2,
    },
    {
      type: "pcb_note_dimension",
      pcb_note_dimension_id: "note_dim_outside",
      layer: "top",
      from: { x: 80, y: -80 },
      to: { x: 120, y: -80 },
      font: "tscircuit2024",
      font_size: 1,
      arrow_size: 1,
    },
  ]

  expect(convertCircuitJsonToPcbSvg(outsideNotes, options)).not.toBe(baseline)
  expect(
    convertCircuitJsonToPcbSvg(outsideNotes, {
      ...options,
      showPcbNotes: false,
    }),
  ).toBe(baseline)
})

test("pcb_courtyard_circle, pcb_courtyard_outline, and pcb_courtyard_polygon contribute to bounds only when showCourtyards is true", () => {
  const courtyardElements: AnyCircuitElement[] = [
    board,
    {
      type: "pcb_courtyard_circle",
      pcb_courtyard_circle_id: "cy_circle_1",
      pcb_component_id: "comp_1",
      layer: "top",
      center: { x: 30, y: 0 },
      radius: 5,
    },
    {
      type: "pcb_courtyard_outline",
      pcb_courtyard_outline_id: "cy_outline_1",
      pcb_component_id: "comp_1",
      layer: "top",
      outline: [
        { x: -40, y: -5 },
        { x: -30, y: -5 },
        { x: -30, y: 5 },
      ],
    },
    {
      type: "pcb_courtyard_polygon",
      pcb_courtyard_polygon_id: "cy_polygon_1",
      pcb_component_id: "comp_1",
      layer: "top",
      points: [
        { x: -5, y: 25 },
        { x: 5, y: 25 },
        { x: 0, y: 45 },
      ],
    },
  ]

  const bounds = getComprehensivePcbBounds(courtyardElements)
  expect(bounds.minX).toBe(-40)
  expect(bounds.maxX).toBe(35)
  expect(bounds.maxY).toBe(45)

  const options = { includeVersion: false, matchBoardAspectRatio: true }
  const baseline = convertCircuitJsonToPcbSvg([board], options)
  expect(
    convertCircuitJsonToPcbSvg(courtyardElements, {
      ...options,
      showCourtyards: false,
    }),
  ).toBe(baseline)
})

test("pcb_fabrication_note_dimension defaults layer to top and is filtered out on bottom layer", () => {
  const circuit: AnyCircuitElement[] = [
    board,
    {
      type: "pcb_fabrication_note_dimension",
      pcb_fabrication_note_dimension_id: "fab_dim_default_layer",
      from: { x: -5, y: 0 },
      to: { x: 5, y: 0 },
      text: "10.0 mm",
      font: "tscircuit2024",
      font_size: 1,
      arrow_size: 0.8,
    } as unknown as AnyCircuitElement,
  ]

  const topSvg = convertCircuitJsonToPcbSvg(circuit, { layer: "top" })
  const bottomSvg = convertCircuitJsonToPcbSvg(circuit, { layer: "bottom" })

  expect(topSvg).toContain(
    'data-pcb-fabrication-note-dimension-id="fab_dim_default_layer"',
  )
  expect(topSvg).toContain('data-pcb-layer="top"')
  expect(bottomSvg).not.toContain(
    'data-pcb-fabrication-note-dimension-id="fab_dim_default_layer"',
  )
})
