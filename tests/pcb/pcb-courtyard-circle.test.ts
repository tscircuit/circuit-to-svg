import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    num_layers: 2,
    material: "fr4",
    thickness: 1.6,
  },
  {
    type: "pcb_courtyard_circle",
    pcb_courtyard_circle_id: "courtyard0",
    pcb_component_id: "component0",
    center: { x: 0, y: 0 },
    radius: 2,
    layer: "top",
  },
  {
    type: "pcb_courtyard_circle",
    pcb_courtyard_circle_id: "courtyard1",
    pcb_component_id: "component0",
    center: { x: 3, y: 2 },
    radius: 1,
    layer: "bottom",
  },
]

test("pcb courtyard circle", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, { showCourtyards: true })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
