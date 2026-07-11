import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

const courtyardCircleRepro: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board_0",
    center: { x: 0, y: 0 },
    width: 9.4,
    height: 9.4,
    num_layers: 2,
    material: "fr4",
    thickness: 1.6,
  },
  {
    type: "pcb_courtyard_circle",
    pcb_courtyard_circle_id: "courtyard_circle_0",
    pcb_component_id: "pcb_component_0",
    center: { x: 3, y: 0 },
    radius: 5,
    layer: "top",
  },
]

test("repro: pcb_courtyard_circle bounds and viewport", () => {
  const bounds = getComprehensivePcbBounds(courtyardCircleRepro)
  const svg = convertCircuitJsonToPcbSvg(courtyardCircleRepro, {
    showCourtyards: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
