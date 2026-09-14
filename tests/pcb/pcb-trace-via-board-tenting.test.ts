import { expect, test } from "bun:test"
import type { PcbBoard, PcbTrace, PcbVia } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("route vias inherit board defaults and preserve overrides without duplicating standalone vias", () => {
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 75, y: 50 },
    width: 150,
    height: 100,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
    min_via_hole_diameter: 10,
    min_via_pad_diameter: 20,
    default_via_tented_on_top: false,
    default_via_tented_on_bottom: true,
  }
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: [
      { route_type: "wire", x: 10, y: 50, width: 4, layer: "top" },
      { route_type: "wire", x: 25, y: 50, width: 4, layer: "top" },
      {
        route_type: "via",
        x: 25,
        y: 50,
        from_layer: "top",
        to_layer: "bottom",
      },
      { route_type: "wire", x: 25, y: 50, width: 4, layer: "bottom" },
      { route_type: "wire", x: 75, y: 50, width: 4, layer: "bottom" },
      {
        route_type: "via",
        x: 75,
        y: 50,
        from_layer: "bottom",
        to_layer: "top",
        tented_on_top: true,
        tented_on_bottom: false,
      },
      { route_type: "wire", x: 75, y: 50, width: 4, layer: "top" },
      { route_type: "wire", x: 125, y: 50, width: 4, layer: "top" },
      {
        route_type: "via",
        x: 125,
        y: 50,
        from_layer: "top",
        to_layer: "bottom",
      },
    ],
  }
  const standalone: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "standalone",
    x: 125,
    y: 50,
    outer_diameter: 24,
    hole_diameter: 12,
    layers: ["top", "bottom"],
    tented_on_bottom: false,
  }
  const elements = [board, trace, standalone]
  const bottom = convertCircuitJsonToPcbSvg(elements, {
    layer: "bottom",
    showSolderMask: true,
    width: 600,
    height: 400,
  })
  const top = convertCircuitJsonToPcbSvg(elements, {
    layer: "top",
    showSolderMask: true,
  })

  expect(bottom.match(/class="pcb-hole-inner"/g)).toHaveLength(3)
  expect(bottom.match(/class="pcb-via-tenting"/g)).toHaveLength(1)
  expect(top.match(/class="pcb-via-tenting"/g)).toHaveLength(1)
  expect(bottom).toMatchSvgSnapshot(import.meta.path)
  expect(trace.route[2]).not.toHaveProperty("tented_on_bottom")
})
