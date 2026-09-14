import { expect, test } from "bun:test"
import type { PcbTrace } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("route via tenting works without a board and only with soldermask enabled", () => {
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: [
      { route_type: "wire", x: 10, y: 50, width: 4, layer: "top" },
      { route_type: "wire", x: 50, y: 50, width: 4, layer: "top" },
      {
        route_type: "via",
        x: 50,
        y: 50,
        from_layer: "top",
        to_layer: "bottom",
        hole_diameter: 10,
        outer_diameter: 20,
        tented_on_top: true,
        tented_on_bottom: false,
      },
    ],
  }
  const top = convertCircuitJsonToPcbSvg([trace], { showSolderMask: true })
  const bottom = convertCircuitJsonToPcbSvg([trace], {
    layer: "bottom",
    showSolderMask: true,
  })
  const copper = convertCircuitJsonToPcbSvg([trace], { showSolderMask: false })

  expect(top).toContain('class="pcb-via-tenting"')
  expect(bottom).not.toContain('class="pcb-via-tenting"')
  expect(copper).not.toContain('class="pcb-via-tenting"')
})
