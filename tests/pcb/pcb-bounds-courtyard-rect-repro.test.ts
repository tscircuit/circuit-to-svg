import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

const courtyardRectRepro: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board_0",
    center: { x: 0, y: 0 },
    width: 9.4,
    height: 5.4,
    num_layers: 2,
    material: "fr4",
    thickness: 1.6,
  },
  {
    type: "pcb_courtyard_rect",
    pcb_courtyard_rect_id: "courtyard_rect_0",
    pcb_component_id: "pcb_component_0",
    center: { x: 4, y: 0 },
    width: 10,
    height: 6,
    layer: "top",
  },
]

test("repro: pcb_courtyard_rect bounds and viewport", () => {
  const bounds = getComprehensivePcbBounds(courtyardRectRepro)

  const svg = convertCircuitJsonToPcbSvg(courtyardRectRepro, {
    showCourtyards: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
