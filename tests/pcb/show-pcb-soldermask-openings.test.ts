import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: AnyCircuitElement[] = [
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
    type: "pcb_soldermask_opening",
    pcb_soldermask_opening_id: "rectangular_opening",
    layer: "top",
    shape: "rotated_rect",
    x: -2,
    y: 0,
    width: 2,
    height: 4,
    ccw_rotation: 20,
  },
  {
    type: "pcb_soldermask_opening",
    pcb_soldermask_opening_id: "polygonal_opening",
    layer: "top",
    shape: "polygon",
    points: [
      { x: 0.5, y: -2 },
      { x: 3.5, y: -2 },
      { x: 2.5, y: 0 },
      { x: 3.5, y: 2 },
      { x: 0.5, y: 2 },
    ],
  },
]

test("showSolderMask renders explicit soldermask openings", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "top",
    showSolderMask: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
