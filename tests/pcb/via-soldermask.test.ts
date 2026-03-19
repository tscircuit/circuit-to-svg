import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuit: any = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 6,
  },
  {
    type: "pcb_via",
    pcb_via_id: "via0",
    x: -2,
    y: 0,
    outer_diameter: 0.8,
    hole_diameter: 0.4,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "via1",
    x: 2,
    y: 0,
    outer_diameter: 0.8,
    hole_diameter: 0.4,
    layers: ["top", "bottom"],
    is_covered_with_solder_mask: false,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace0",
    route: [
      { route_type: "wire", x: -4, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: 4, y: 0, width: 0.2, layer: "top" },
    ],
  },
]

test("via solder mask is rendered when showSolderMask is enabled", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
  })

  // Should contain soldermask overlay elements for the covered via
  expect(svg).toContain("pcb-via-soldermask")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("via solder mask is not rendered when showSolderMask is disabled", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit)

  // Should NOT contain soldermask overlay elements
  expect(svg).not.toContain("pcb-via-soldermask")
})
