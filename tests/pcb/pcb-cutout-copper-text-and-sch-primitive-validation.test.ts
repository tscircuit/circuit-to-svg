import { expect, test } from "bun:test"
import { identity } from "transformation-matrix"
import { colorMap } from "../../lib/utils/colors"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/pcb/colors"
import type { PcbContext } from "../../lib/pcb/convert-circuit-json-to-pcb-svg"
import { createSvgObjectsFromPcbCutout } from "../../lib/pcb/svg-object-fns/create-svg-objects-from-pcb-cutout"
import { createSvgObjectsFromPcbCutoutPath } from "../../lib/pcb/svg-object-fns/create-svg-objects-from-pcb-cutout-path"
import { createSvgObjectsFromPcbCopperText } from "../../lib/pcb/svg-object-fns/create-svg-objects-from-pcb-copper-text"
import { createSvgObjectsFromSchematicArc } from "../../lib/sch/svg-object-fns/create-svg-objects-from-sch-arc"
import { createSvgObjectsFromSchematicCircle } from "../../lib/sch/svg-object-fns/create-svg-objects-from-sch-circle"
import { createSvgObjectsFromSchematicLine } from "../../lib/sch/svg-object-fns/create-svg-objects-from-sch-line"
import { createSvgObjectsFromSchematicPath } from "../../lib/sch/svg-object-fns/create-svg-objects-from-sch-path"
import { getSchematicStrokeDasharray } from "../../lib/sch/svg-object-fns/get-schematic-stroke-dasharray"

const createPcbCtx = (): PcbContext => ({
  transform: identity(),
  colorMap: DEFAULT_PCB_COLOR_MAP,
})

test("createSvgObjectsFromPcbCutout validates rect, circle, and polygon cutout geometry and clamps corner_radius", () => {
  const ctx = createPcbCtx()

  expect(
    createSvgObjectsFromPcbCutout(
      {
        type: "pcb_cutout",
        pcb_cutout_id: "cutout_bad_rect",
        shape: "rect",
        center: { x: 0, y: 0 },
        width: -4,
        height: 2,
      } as any,
      ctx,
    ),
  ).toEqual([])

  const clampedRect = createSvgObjectsFromPcbCutout(
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout_clamped_rect",
      shape: "rect",
      center: { x: 2, y: 3 },
      width: 4,
      height: 2,
      rotation: Number.NaN,
      corner_radius: 10,
    } as any,
    ctx,
  )
  expect(clampedRect).toHaveLength(1)
  expect(clampedRect[0]?.attributes.rx).toBe("1")
  expect(clampedRect[0]?.attributes.ry).toBe("1")
  expect(clampedRect[0]?.attributes.transform).not.toContain("NaN")

  expect(
    createSvgObjectsFromPcbCutout(
      {
        type: "pcb_cutout",
        pcb_cutout_id: "cutout_bad_circle",
        shape: "circle",
        center: { x: 0, y: 0 },
        radius: 0,
      } as any,
      ctx,
    ),
  ).toEqual([])

  expect(
    createSvgObjectsFromPcbCutout(
      {
        type: "pcb_cutout",
        pcb_cutout_id: "cutout_bad_poly",
        shape: "polygon",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: Number.NaN, y: 1 },
        ],
      } as any,
      ctx,
    ),
  ).toEqual([])
})

test("createSvgObjectsFromPcbCutoutPath filters non-finite route points and rejects degenerate routes", () => {
  const ctx = createPcbCtx()

  expect(
    createSvgObjectsFromPcbCutoutPath(
      {
        type: "pcb_cutout",
        pcb_cutout_id: "cutout_empty_path",
        shape: "path",
        route: [],
      } as any,
      ctx,
    ),
  ).toEqual([])

  expect(
    createSvgObjectsFromPcbCutoutPath(
      {
        type: "pcb_cutout",
        pcb_cutout_id: "cutout_collapsed_closed_path",
        shape: "path",
        route: [
          { x: 1, y: 1 },
          { x: 1, y: 1 },
        ],
      } as any,
      ctx,
    ),
  ).toEqual([])

  const filtered = createSvgObjectsFromPcbCutoutPath(
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout_valid_path",
      shape: "path",
      route: [
        { x: 0, y: 0 },
        { x: Number.NaN, y: 2 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 0 },
      ],
    } as any,
    ctx,
  )
  expect(filtered).toHaveLength(1)
  expect(filtered[0]?.attributes.d).toBe("M 0 0 L 4 0 L 4 3 Z")
})

test("createSvgObjectsFromPcbCopperText sanitizes non-finite font_size, rotation, and knockout_padding", () => {
  const ctx = createPcbCtx()

  expect(
    createSvgObjectsFromPcbCopperText(
      {
        type: "pcb_copper_text",
        pcb_copper_text_id: "ct_bad_anchor",
        pcb_component_id: "comp_1",
        anchor_position: { x: Number.NaN, y: 0 },
        anchor_alignment: "center",
        font: "tscircuit2024",
        font_size: 1,
        layer: "top",
        text: "HI",
      } as any,
      ctx,
    ),
  ).toEqual([])

  const objs = createSvgObjectsFromPcbCopperText(
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "ct_knockout",
      pcb_component_id: "comp_1",
      anchor_position: { x: 1, y: 2 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: Number.NaN,
      ccw_rotation: Number.NaN,
      is_knockout: true,
      knockout_padding: {
        left: -1,
        right: Number.NaN,
        top: Number.POSITIVE_INFINITY,
        bottom: 0.2,
      },
      layer: "top",
      text: "A",
    } as any,
    ctx,
  )
  expect(objs).toHaveLength(2)
  const rectAttr = objs[1]?.attributes
  expect(rectAttr?.width).not.toContain("NaN")
  expect(rectAttr?.height).not.toContain("NaN")
  expect(rectAttr?.transform).not.toContain("NaN")
})

test("schematic arc, circle, line, path, and dasharray helpers validate non-finite and non-positive values", () => {
  const transform = identity()

  expect(
    getSchematicStrokeDasharray({
      isDashed: true,
      dashLength: Number.NaN,
      dashGap: -2,
      strokeWidth: 0.05,
      transform,
    }),
  ).toBe("0.15000000000000002 0.15000000000000002")

  expect(
    createSvgObjectsFromSchematicArc({
      schArc: {
        type: "schematic_arc",
        schematic_arc_id: "arc_bad",
        center: { x: 0, y: 0 },
        radius: 0,
        start_angle_degrees: 0,
        end_angle_degrees: 90,
        direction: "counterclockwise",
        color: "#000",
        is_dashed: false,
      },
      transform,
      colorMap,
    }),
  ).toEqual([])

  const validArc = createSvgObjectsFromSchematicArc({
    schArc: {
      type: "schematic_arc",
      schematic_arc_id: "arc_ok",
      center: { x: 0, y: 0 },
      radius: 2,
      start_angle_degrees: 0,
      end_angle_degrees: 90,
      direction: "counterclockwise",
      stroke_width: Number.NaN,
      color: "#000",
      is_dashed: false,
    },
    transform,
    colorMap,
  })
  expect(validArc).toHaveLength(1)
  expect(validArc[0]?.attributes["stroke-width"]).toBe("0.02")

  expect(
    createSvgObjectsFromSchematicCircle({
      schCircle: {
        type: "schematic_circle",
        schematic_circle_id: "circle_bad",
        center: { x: 0, y: 0 },
        radius: -1,
        color: "#000",
        is_filled: false,
        is_dashed: false,
      },
      transform,
      colorMap,
    }),
  ).toEqual([])

  expect(
    createSvgObjectsFromSchematicLine({
      schLine: {
        type: "schematic_line",
        schematic_line_id: "line_bad",
        x1: 0,
        y1: 0,
        x2: Number.NaN,
        y2: 1,
        color: "#000",
        is_dashed: false,
      },
      transform,
      colorMap,
    }),
  ).toEqual([])

  const pathObjs = createSvgObjectsFromSchematicPath({
    schPath: {
      type: "schematic_path",
      schematic_component_id: "sch_comp_1",
      points: [
        { x: 0, y: 0 },
        { x: Number.NaN, y: 1 },
        { x: 2, y: 3 },
      ],
      stroke_width: -1,
      is_filled: false,
    } as any,
    transform,
    colorMap,
  })
  expect(pathObjs).toHaveLength(1)
  expect(pathObjs[0]?.attributes.d).toBe("M 0 0 L 2 3")
  expect(pathObjs[0]?.attributes["stroke-width"]).toBe("0.02")
})
