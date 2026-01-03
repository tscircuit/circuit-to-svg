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
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad0",
    shape: "rect",
    width: 1,
    height: 1,
    x: 0,
    y: 0,
    layer: "top",
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "hole0",
    hole_shape: "circle",
    hole_diameter: 1,
    x: 3,
    y: 0,
  },
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "ss0",
    pcb_component_id: "comp0",
    x1: -1,
    y1: 0,
    x2: -1,
    y2: 3,
    stroke_width: 0.1,
    layer: "top",
  },
]

test("color overrides", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    colorOverrides: {
      copper: { top: "#ff0000" },
      drill: "#0000ff",
      boardOutline: "#00ff00",
      silkscreen: { top: "#eeeeee" },
    },
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
