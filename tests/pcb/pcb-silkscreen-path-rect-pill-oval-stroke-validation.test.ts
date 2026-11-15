import { describe, expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "../../lib"

describe("pcb silkscreen path, rect, pill, and oval stroke width and validation", () => {
  test("skips empty silkscreen paths, does not close single-point paths with Z, and defaults omitted stroke_width", () => {
    const svg = convertCircuitJsonToPcbSvg([
      {
        type: "pcb_board",
        pcb_board_id: "board_1",
        center: { x: 0, y: 0 },
        width: 20,
        height: 20,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
      },
      {
        type: "pcb_silkscreen_path",
        pcb_silkscreen_path_id: "empty_path",
        pcb_component_id: "comp_1",
        layer: "top",
        route: [],
        stroke_width: 0.15,
      },
      {
        type: "pcb_silkscreen_path",
        pcb_silkscreen_path_id: "single_point_path",
        pcb_component_id: "comp_1",
        layer: "top",
        route: [{ x: 1, y: 2 }],
      },
      {
        type: "pcb_silkscreen_path",
        pcb_silkscreen_path_id: "closed_triangle_path",
        pcb_component_id: "comp_1",
        layer: "top",
        route: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 1, y: 2 },
          { x: 0, y: 0 },
        ],
      },
    ] as any)

    expect(svg).not.toContain('data-pcb-silkscreen-path-id="empty_path"')
    expect(svg).toContain('data-pcb-silkscreen-path-id="single_point_path"')
    expect(svg).not.toMatch(/d="M [^L"]+ Z"/)
    expect(svg).toMatch(/d="M [^"]+ L [^"]+ L [^"]+ L [^"]+ Z"/)
    expect(svg).not.toContain("NaN")
  })

  test("defaults omitted stroke_width on pcb_silkscreen_rect, clamps corner_radius, and honors stroke_width on pill/oval", () => {
    const svg = convertCircuitJsonToPcbSvg([
      {
        type: "pcb_board",
        pcb_board_id: "board_1",
        center: { x: 0, y: 0 },
        width: 20,
        height: 20,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
      },
      {
        type: "pcb_silkscreen_rect",
        pcb_silkscreen_rect_id: "rect_default_stroke",
        pcb_component_id: "comp_1",
        layer: "top",
        center: { x: 0, y: 0 },
        width: 4,
        height: 2,
        corner_radius: 5,
        has_stroke: true,
      },
      {
        type: "pcb_silkscreen_pill",
        pcb_silkscreen_pill_id: "pill_custom_stroke",
        pcb_component_id: "comp_1",
        layer: "top",
        center: { x: 3, y: 0 },
        width: 2,
        height: 1,
        stroke_width: 0.25,
      },
      {
        type: "pcb_silkscreen_pill",
        pcb_silkscreen_pill_id: "pill_invalid_center",
        pcb_component_id: "comp_1",
        layer: "top",
        center: undefined,
        width: 2,
        height: 1,
      },
      {
        type: "pcb_silkscreen_oval",
        pcb_silkscreen_oval_id: "oval_custom_stroke",
        pcb_component_id: "comp_1",
        layer: "top",
        center: { x: -3, y: 0 },
        radius_x: 1.5,
        radius_y: 0.75,
        stroke_width: 0.3,
      },
    ] as any)

    expect(svg).not.toContain("NaN")
    expect(svg).toContain('data-pcb-silkscreen-rect-id="rect_default_stroke"')
    expect(svg).toContain('data-pcb-silkscreen-pill-id="pill_custom_stroke"')
    expect(svg).not.toContain(
      'data-pcb-silkscreen-pill-id="pill_invalid_center"',
    )
    expect(svg).toContain('data-pcb-silkscreen-oval-id="oval_custom_stroke"')

    const rectMatch = svg.match(
      /<rect[^>]*height="([^"]+)"[^>]*data-pcb-silkscreen-rect-id="rect_default_stroke"[^>]*rx="([^"]+)"/,
    )
    expect(rectMatch).not.toBeNull()
    expect(Number(rectMatch![2])).toBeCloseTo(Number(rectMatch![1]) / 2, 5)
  })
})
