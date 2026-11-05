import { expect, test } from "bun:test"
import { DEFAULT_PCB_COLOR_MAP } from "lib/pcb/colors"
import type { PcbContext } from "lib/pcb/convert-circuit-json-to-pcb-svg"
import { createSvgObjectsFromPcbCourtyardOutline } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-courtyard-outline"
import { createSvgObjectsFromPcbCourtyardPolygon } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-courtyard-polygon"
import { createSvgObjectsFromPcbFabricationNoteRect } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-fabrication-note-rect"
import { createSvgObjectsFromPcbFabricationNoteText } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-fabrication-note-text"
import { createSvgObjectsFromPcbNoteDimension } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-note-dimension"
import { createSvgObjectsFromPcbNoteLine } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-note-line"
import { createSvgObjectsFromPcbNotePath } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-note-path"
import { createSvgObjectsFromPcbNoteRect } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-note-rect"
import { createSvgObjectsFromPcbNoteText } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-note-text"
import { stringifySvg } from "lib/utils/stringify-svg"
import { identity } from "transformation-matrix"

const ctx: PcbContext = {
  transform: identity(),
  colorMap: DEFAULT_PCB_COLOR_MAP,
}

test("courtyard outline defaults omitted layer to top and rejects degenerate or non-finite points", () => {
  const valid = createSvgObjectsFromPcbCourtyardOutline(
    {
      type: "pcb_courtyard_outline",
      pcb_courtyard_outline_id: "co_1",
      pcb_component_id: "comp_1",
      outline: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 4 },
      ],
    } as any,
    ctx,
  )
  expect(valid).toHaveLength(1)
  expect(valid[0]?.attributes["data-pcb-layer"]).toBe("top")
  expect(valid[0]?.attributes.class).toBe(
    "pcb-courtyard-outline pcb-courtyard-top",
  )

  expect(
    createSvgObjectsFromPcbCourtyardOutline(
      {
        type: "pcb_courtyard_outline",
        pcb_courtyard_outline_id: "co_short",
        pcb_component_id: "comp_1",
        layer: "top",
        outline: [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
        ],
      },
      ctx,
    ),
  ).toEqual([])

  expect(
    createSvgObjectsFromPcbCourtyardOutline(
      {
        type: "pcb_courtyard_outline",
        pcb_courtyard_outline_id: "co_nan",
        pcb_component_id: "comp_1",
        layer: "top",
        outline: [
          { x: 0, y: 0 },
          { x: Number.NaN, y: 0 },
          { x: 4, y: 4 },
        ],
      },
      ctx,
    ),
  ).toEqual([])
})

test("courtyard polygon rejects fewer than 3 points or non-finite points", () => {
  expect(
    createSvgObjectsFromPcbCourtyardPolygon(
      {
        type: "pcb_courtyard_polygon",
        pcb_courtyard_polygon_id: "cp_short",
        pcb_component_id: "comp_1",
        layer: "top",
        points: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
        ],
      },
      ctx,
    ),
  ).toEqual([])

  expect(
    createSvgObjectsFromPcbCourtyardPolygon(
      {
        type: "pcb_courtyard_polygon",
        pcb_courtyard_polygon_id: "cp_inf",
        pcb_component_id: "comp_1",
        layer: "top",
        points: [
          { x: 0, y: 0 },
          { x: 2, y: Number.POSITIVE_INFINITY },
          { x: 2, y: 2 },
        ],
      },
      ctx,
    ),
  ).toEqual([])
})

test("fabrication note rect and text validate non-finite dimensions, radii, font sizes, and rotations", () => {
  expect(
    createSvgObjectsFromPcbFabricationNoteRect(
      {
        type: "pcb_fabrication_note_rect",
        pcb_fabrication_note_rect_id: "fab_rect_bad",
        pcb_component_id: "comp_1",
        layer: "top",
        center: { x: 0, y: 0 },
        width: 0,
        height: 4,
        stroke_width: 0.1,
      },
      ctx,
    ),
  ).toEqual([])

  const sanitizedRect = createSvgObjectsFromPcbFabricationNoteRect(
    {
      type: "pcb_fabrication_note_rect",
      pcb_fabrication_note_rect_id: "fab_rect_sanitized",
      pcb_component_id: "comp_1",
      layer: "top",
      center: { x: 0, y: 0 },
      width: 4,
      height: 2,
      stroke_width: Number.NaN,
      corner_radius: Number.POSITIVE_INFINITY,
      has_stroke: true,
    },
    ctx,
  )
  expect(sanitizedRect).toHaveLength(1)
  expect(sanitizedRect[0]?.attributes["stroke-width"]).toBe("0")
  expect(sanitizedRect[0]?.attributes.rx).toBeUndefined()

  const sanitizedText = createSvgObjectsFromPcbFabricationNoteText(
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fab_text_sanitized",
      pcb_component_id: "comp_1",
      layer: "top",
      anchor_position: { x: 1, y: 2 },
      anchor_alignment: "center",
      text: "FAB",
      font: "tscircuit2024",
      font_size: Number.NaN,
      ccw_rotation: Number.POSITIVE_INFINITY,
    },
    ctx,
  )
  expect(sanitizedText).toHaveLength(1)
  expect(sanitizedText[0]?.attributes["font-size"]).toBe("1")
  expect(sanitizedText[0]?.attributes.transform).not.toContain("NaN")
})

test("pcb note primitives sanitize non-finite stroke_width, font_size, offset_distance, and coordinates", () => {
  expect(
    createSvgObjectsFromPcbNoteLine(
      {
        type: "pcb_note_line",
        pcb_note_line_id: "line_nan",
        layer: "top",
        x1: Number.NaN,
        y1: 0,
        x2: 5,
        y2: 5,
        stroke_width: 0.1,
      },
      ctx,
    ),
  ).toEqual([])

  const notePathOmittedStroke = createSvgObjectsFromPcbNotePath(
    {
      type: "pcb_note_path",
      pcb_note_path_id: "path_omitted_stroke",
      layer: "top",
      route: [
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ],
      stroke_width: undefined as any,
    },
    ctx,
  )
  expect(notePathOmittedStroke).toHaveLength(1)
  expect(notePathOmittedStroke[0]?.attributes["stroke-width"]).toBe("0.1")

  const noteRectSanitized = createSvgObjectsFromPcbNoteRect(
    {
      type: "pcb_note_rect",
      pcb_note_rect_id: "rect_sanitized",
      layer: "top",
      center: { x: 0, y: 0 },
      width: 4,
      height: 2,
      stroke_width: -1,
      corner_radius: Number.NaN,
      has_stroke: true,
    },
    ctx,
  )
  expect(noteRectSanitized).toHaveLength(1)
  expect(noteRectSanitized[0]?.attributes["stroke-width"]).toBe("0")
  expect(noteRectSanitized[0]?.attributes.rx).toBeUndefined()

  const noteTextSanitized = createSvgObjectsFromPcbNoteText(
    {
      type: "pcb_note_text",
      pcb_note_text_id: "text_sanitized",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "Note",
      font: "tscircuit2024",
      font_size: Number.NaN,
    },
    ctx,
  )
  expect(noteTextSanitized).toHaveLength(1)
  expect(noteTextSanitized[0]?.attributes["font-size"]).toBe("1")

  const noteDimensionSanitized = createSvgObjectsFromPcbNoteDimension(
    {
      type: "pcb_note_dimension",
      pcb_note_dimension_id: "dim_sanitized",
      layer: "top",
      from: { x: 0, y: 0 },
      to: { x: 10, y: 0 },
      arrow_size: 1,
      font: "tscircuit2024",
      font_size: Number.NaN,
      offset_distance: Number.NaN,
      offset_direction: { x: Number.NaN, y: 1 },
      text: "10mm",
      text_ccw_rotation: 45,
    },
    ctx,
  )
  expect(noteDimensionSanitized).toHaveLength(1)
  expect(stringifySvg(noteDimensionSanitized[0]!)).not.toContain("NaN")
})
