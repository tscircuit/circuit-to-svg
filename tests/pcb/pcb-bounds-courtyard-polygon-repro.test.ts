import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

const courtyardPolygonRepro: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board_0",
    center: { x: 0, y: 0 },
    width: 9.4,
    height: 7.4,
    num_layers: 2,
    material: "fr4",
    thickness: 1.6,
  },
  {
    type: "pcb_courtyard_polygon",
    pcb_courtyard_polygon_id: "courtyard_polygon_0",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    points: [
      { x: -9, y: -5 },
      { x: 2, y: -4 },
      { x: 5, y: 1 },
      { x: 1, y: 4 },
      { x: -4, y: 2 },
    ],
  },
]

test("repro: pcb_courtyard_polygon bounds and viewport", () => {
  const bounds = getComprehensivePcbBounds(courtyardPolygonRepro)
  const svg = convertCircuitJsonToPcbSvg(courtyardPolygonRepro, {
    showCourtyards: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
