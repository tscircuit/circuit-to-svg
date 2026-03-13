import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuit: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 14,
    height: 10,
  },
  {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "courtyard0",
    pcb_component_id: "component0",
    center: { x: -4, y: 0 },
    width: 3,
    height: 1.5,
    layer: "top",
    ccw_rotation: 45,
  },
  {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "courtyard1",
    pcb_component_id: "component1",
    center: { x: 0, y: 0 },
    width: 3,
    height: 1.5,
    layer: "top",
    ccw_rotation: 90,
  },
  {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "courtyard2",
    pcb_component_id: "component2",
    center: { x: 4, y: 0 },
    width: 3,
    height: 1.5,
    layer: "bottom",
    ccw_rotation: 135,
  },
]

test("pcb courtyard rect multiple rotated rects", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, { showCourtyards: true })
  expect(svg).toContain("rotate(-45)")
  expect(svg).toContain("rotate(-90)")
  expect(svg).toContain("rotate(-135)")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
