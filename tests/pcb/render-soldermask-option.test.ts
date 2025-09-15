import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuit: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 5,
    height: 5,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace0",
    route: [
      { route_type: "wire", x: -2, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: 2, y: 0, width: 0.2, layer: "top" },
    ],
  },
]

test("does not render soldermask overlay by default", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    colorOverrides: {
      copper: { top: "#ff0000" },
      soldermask: { top: "#00ff00" },
    },
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "disabled")
})

test("renders soldermask overlay when enabled", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    colorOverrides: {
      copper: { top: "#ff0000" },
      soldermask: { top: "#00ff00" },
    },
    renderSolderMask: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "enabled")
})
