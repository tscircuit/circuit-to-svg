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
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "paste_polygon",
    pcb_component_id: "component0",
    layer: "top",
    shape: "polygon",
    points: [
      { x: -2, y: -1 },
      { x: -0.5, y: -1 },
      { x: -0.5, y: -0.25 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: -1 },
      { x: 2, y: -1 },
      { x: 2, y: 1 },
      { x: 0.5, y: 1 },
      { x: 0.5, y: 0.25 },
      { x: -0.5, y: 0.25 },
      { x: -0.5, y: 1 },
      { x: -2, y: 1 },
    ],
  },
]

test("showSolderPaste renders polygonal paste apertures", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "top",
    showSolderPaste: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
