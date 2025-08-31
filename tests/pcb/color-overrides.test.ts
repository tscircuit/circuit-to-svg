import { expect, test } from "bun:test"
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
    diameter: 1,
    x: 3,
    y: 0,
  },
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "ss0",
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
