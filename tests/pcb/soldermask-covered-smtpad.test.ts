import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("solder mask covers smtpads marked as covered", () => {
  const circuit: any = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 6,
      height: 4,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace0",
      route: [
        { route_type: "wire", x: -2.5, y: 0, width: 0.35, layer: "top" },
        { route_type: "wire", x: 1.2, y: 0, width: 0.35, layer: "top" },
      ],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "via0",
      shape: "circle",
      x: 1.2,
      y: 0,
      outer_diameter: 1.2,
      hole_diameter: 0.6,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_masked",
      shape: "rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 1.8,
      height: 1.2,
      is_covered_with_solder_mask: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_exposed",
      shape: "circle",
      layer: "top",
      x: -1.8,
      y: -0.9,
      radius: 0.5,
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuit, {
    colorOverrides: {
      soldermask: { top: "rgb(20, 51, 36)" },
    },
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
