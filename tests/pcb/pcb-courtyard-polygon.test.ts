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
    type: "pcb_courtyard_polygon",
    pcb_courtyard_polygon_id: "courtyard0",
    pcb_component_id: "component0",
    layer: "top",
    points: [
      { x: -2, y: -1.5 },
      { x: 2, y: -1.5 },
      { x: 2, y: 1.5 },
      { x: -2, y: 1.5 },
    ],
  },
  {
    type: "pcb_courtyard_polygon",
    pcb_courtyard_polygon_id: "courtyard1",
    pcb_component_id: "component1",
    layer: "bottom",
    points: [
      { x: 3, y: 1 },
      { x: 5, y: 1 },
      { x: 5, y: 3 },
      { x: 4, y: 3.5 },
      { x: 3, y: 3 },
    ],
  },
]

test("pcb courtyard polygon", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, { showCourtyards: true })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
