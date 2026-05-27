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
    solder_mask_color: "#202060",
    silkscreen_color: "#ffd200",
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
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad0",
    shape: "rect",
    x: -2,
    y: -1,
    width: 1.2,
    height: 0.8,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    shape: "rect",
    x: 2,
    y: -1,
    width: 1.2,
    height: 0.8,
    layer: "top",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace0",
    route: [
      { route_type: "wire", x: -2, y: -1, width: 0.3, layer: "top" },
      { route_type: "wire", x: 2, y: -1, width: 0.3, layer: "top" },
    ],
  },
]

test("pcb_board colors are only used in realistic soldermask render", () => {
  const normalSvg = convertCircuitJsonToPcbSvg(circuit)

  expect(normalSvg).not.toContain('stroke="yellow"')

  const svg = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
  })

  expect(svg).toContain('class="pcb-board-soldermask"')
  expect(svg).toContain('fill="#202060"')
  expect(svg).toContain('class="pcb-silkscreen-line pcb-silkscreen-top"')
  expect(svg).toContain('stroke="#ffd200"')
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
