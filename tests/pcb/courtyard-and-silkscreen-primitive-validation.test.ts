import { describe, expect, test } from "bun:test"
import { identity } from "transformation-matrix"
import { convertCircuitJsonToPcbSvg } from "../../lib"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/pcb/colors"
import { createSvgObjectsFromPcbCourtyardCircle } from "../../lib/pcb/svg-object-fns/create-svg-objects-from-pcb-courtyard-circle"
import { createSvgObjectsFromPcbSilkscreenCircle } from "../../lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-circle"
import { createSvgObjectsFromPcbSilkscreenLine } from "../../lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-line"

describe("courtyard and silkscreen primitive validation", () => {
  test("ignores non-finite or 360-degree ccw_rotation on pcb_courtyard_rect instead of emitting rotate(NaN)", () => {
    const svg = convertCircuitJsonToPcbSvg(
      [
        {
          type: "pcb_board",
          pcb_board_id: "board_1",
          center: { x: 0, y: 0 },
          width: 10,
          height: 10,
          thickness: 1.6,
          num_layers: 2,
          material: "fr4",
        },
        {
          type: "pcb_courtyard_rect",
          pcb_courtyard_rect_id: "cr_nan_rot",
          pcb_component_id: "comp_1",
          layer: "top",
          center: { x: 2, y: 3 },
          width: 4,
          height: 2,
          ccw_rotation: Number.NaN,
        },
        {
          type: "pcb_courtyard_rect",
          pcb_courtyard_rect_id: "cr_360_rot",
          pcb_component_id: "comp_1",
          layer: "top",
          center: { x: -2, y: -3 },
          width: 4,
          height: 2,
          ccw_rotation: 360,
        },
        {
          type: "pcb_courtyard_rect",
          pcb_courtyard_rect_id: "cr_zero_width",
          pcb_component_id: "comp_1",
          layer: "top",
          center: { x: 0, y: 0 },
          width: 0,
          height: 2,
        },
      ] as any,
      { showCourtyards: true },
    )

    expect(svg).toContain('data-pcb-courtyard-rect-id="cr_nan_rot"')
    expect(svg).toContain('data-pcb-courtyard-rect-id="cr_360_rot"')
    expect(svg).not.toContain('data-pcb-courtyard-rect-id="cr_zero_width"')
    expect(svg).not.toContain("rotate(NaN)")
    expect(svg).not.toContain("rotate(-360)")
  })

  test("skips non-positive or non-finite radii on courtyard/silkscreen circles and guards silkscreen line stroke_width", () => {
    const ctx = {
      transform: identity(),
      colorMap: DEFAULT_PCB_COLOR_MAP,
    } as any

    expect(
      createSvgObjectsFromPcbCourtyardCircle(
        {
          type: "pcb_courtyard_circle",
          pcb_courtyard_circle_id: "cc_bad",
          pcb_component_id: "comp_1",
          layer: "top",
          center: { x: 0, y: 0 },
          radius: 0,
        },
        ctx,
      ),
    ).toEqual([])

    expect(
      createSvgObjectsFromPcbSilkscreenCircle(
        {
          type: "pcb_silkscreen_circle",
          pcb_silkscreen_circle_id: "sc_bad",
          pcb_component_id: "comp_1",
          layer: "top",
          center: { x: 0, y: 0 },
          radius: -1,
          stroke_width: 0.1,
        },
        ctx,
      ),
    ).toEqual([])

    const lineObjs = createSvgObjectsFromPcbSilkscreenLine(
      {
        type: "pcb_silkscreen_line",
        pcb_silkscreen_line_id: "sl_nan_stroke",
        pcb_component_id: "comp_1",
        layer: "top",
        x1: -1,
        y1: -1,
        x2: 1,
        y2: 1,
        stroke_width: Number.NaN,
      },
      ctx,
    )
    expect(lineObjs).toHaveLength(1)
    expect(lineObjs[0]?.attributes["stroke-width"]).toBe("0.1")

    expect(
      createSvgObjectsFromPcbSilkscreenLine(
        {
          type: "pcb_silkscreen_line",
          pcb_silkscreen_line_id: "sl_nan_coord",
          pcb_component_id: "comp_1",
          layer: "top",
          x1: Number.NaN,
          y1: 0,
          x2: 1,
          y2: 1,
          stroke_width: 0.1,
        },
        ctx,
      ),
    ).toEqual([])
  })
})
