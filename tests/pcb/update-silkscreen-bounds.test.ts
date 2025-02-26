import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen elements bounds calculation", () => {
  const result = convertCircuitJsonToPcbSvg([
    // Test silkscreen rect
    {
      type: "pcb_silkscreen_rect",
      layer: "top" as const,
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_rect_id: "rect_1",
      center: { x: 10, y: 5 },
      width: 4,
      height: 2,
      stroke_width: 0.1,
    },
    // Test silkscreen circle
    {
      type: "pcb_silkscreen_circle",
      layer: "top" as const,
      pcb_component_id: "pcb_component_2",
      pcb_silkscreen_circle_id: "circle_1",
      center: { x: -5, y: -5 },
      radius: 3,
      stroke_width: 0.1,
    },
    // Test silkscreen line (fixed: added x1, y1, x2, y2, and stroke_width)
    {
      type: "pcb_silkscreen_line",
      layer: "bottom" as const,
      pcb_component_id: "pcb_component_3",
      pcb_silkscreen_line_id: "line_1",
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
      stroke_width: 0.5,
    },
    // Test silkscreen path (fixed: renamed 'points' to 'route' and added stroke_width)
    {
      type: "pcb_silkscreen_path",
      layer: "top" as const,
      pcb_component_id: "pcb_component_4",
      pcb_silkscreen_path_id: "path_1",
      route: [
        { x: 15, y: 10 },
        { x: 20, y: 15 },
        { x: 25, y: 10 },
      ],
      stroke_width: 0.1,
    },
    // Test fabrication note path
    {
      type: "pcb_fabrication_note_path",
      layer: "top",
      pcb_component_id: "pcb_generic_component_0",
      pcb_fabrication_note_path_id: "fabrication_note_path_1",
      route: [
        { x: 12.295, y: 7.24 },
        { x: 12.295, y: -7.24 },
      ],
      stroke_width: 0.1,
    },
    // Test fabrication note text (fixed: replaced center with anchor_position and added font details)
    {
      type: "pcb_fabrication_note_text",
      layer: "top",
      pcb_component_id: "pcb_generic_component_0",
      pcb_fabrication_note_text_id: "fabrication_note_text_1",
      anchor_position: { x: 5, y: 5 },
      text: "Test Note",
      font: "tscircuit2024",
      font_size: 12,
      anchor_alignment: "center",
    },
  ])

  expect(result).toMatchSvgSnapshot(
    import.meta.path + "all-silkscreen-elements",
  )
})

test("silkscreen elements with mixed components", () => {
  const result = convertCircuitJsonToPcbSvg([
    // PCB board (fixed: added thickness and num_layers)
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
    },
    // Silkscreen element
    {
      type: "pcb_silkscreen_rect",
      layer: "top" as const,
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_rect_id: "rect_1",
      center: { x: 8, y: 6 },
      width: 4,
      height: 2,
      stroke_width: 0.1,
    },
    // Trace (fixed: updated route points with required properties)
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_1",
      route: [
        { x: 0, y: 0, width: 0.2, layer: "top", route_type: "wire" },
        { x: 10, y: 10, width: 0.2, layer: "top", route_type: "wire" },
      ],
    },
    // Via (fixed: replaced center with x and y, and added required properties)
    {
      type: "pcb_via",
      pcb_via_id: "via_1",
      x: 5,
      y: 5,
      hole_diameter: 0.5,
      outer_diameter: 1.0,
      layers: ["top", "bottom"],
      from_layer: "top",
      to_layer: "bottom",
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path + "mixed-elements")
})

test("silkscreen elements at extreme positions", () => {
  const result = convertCircuitJsonToPcbSvg([
    // Far top-right
    {
      type: "pcb_silkscreen_rect",
      layer: "top" as const,
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_rect_id: "rect_1",
      center: { x: 100, y: 100 },
      width: 10,
      height: 10,
      stroke_width: 0.1,
    },

    // Far bottom-left
    {
      type: "pcb_silkscreen_circle",
      layer: "bottom" as const,
      pcb_component_id: "pcb_component_2",
      pcb_silkscreen_circle_id: "circle_1",
      center: { x: -100, y: -100 },
      radius: 5,
      stroke_width: 0.1,
    },
    // Center reference PCB board (fixed: added thickness and num_layers)
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 50,
      height: 50,
      thickness: 1.6,
      num_layers: 2,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path + "extreme-positions")
})
