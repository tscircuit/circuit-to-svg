import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuit: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
  },
  {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "courtyard0",
    pcb_component_id: "component0",
    center: { x: 0, y: 0 },
    width: 4,
    height: 3,
    layer: "top",
  },
  {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "courtyard1",
    pcb_component_id: "component0",
    center: { x: 3, y: 2 },
    width: 2,
    height: 2,
    layer: "bottom",
  },
]

test("pcb courtyard rect", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, { showCourtyards: true })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
