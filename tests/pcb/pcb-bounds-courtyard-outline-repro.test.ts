import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

const courtyardOutlineRepro: AnyCircuitElement[] = [
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
    type: "pcb_courtyard_outline",
    pcb_courtyard_outline_id: "courtyard_outline_0",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    outline: [
      { x: -5, y: -4 },
      { x: 5, y: -4 },
      { x: 5, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 4 },
      { x: -9, y: 4 },
    ],
  },
]

test("repro: pcb_courtyard_outline bounds and viewport", () => {
  const bounds = getComprehensivePcbBounds(courtyardOutlineRepro)
  const svg = convertCircuitJsonToPcbSvg(courtyardOutlineRepro, {
    showCourtyards: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
