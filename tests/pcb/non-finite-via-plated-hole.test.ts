import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib/pcb/convert-circuit-json-to-pcb-svg"
import type { AnyCircuitElement } from "circuit-json"

test("non-finite via and plated-hole diameters render without NaN (#634)", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
    },
    {
      type: "pcb_via",
      pcb_via_id: "via1",
      x: 5,
      y: 5,
      hole_diameter: Number.NaN,
      outer_diameter: 0.6,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph1",
      shape: "circle",
      x: -5,
      y: -5,
      hole_diameter: Number.NaN,
      outer_diameter: 1.0,
      layers: ["top", "bottom"],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svg).not.toContain("NaN")
  expect(svg).toContain('class="pcb-hole-inner"')
  expect(svg).toContain('data-type="pcb_via"')
  expect(svg).toContain('data-type="pcb_plated_hole_drill"')
})
