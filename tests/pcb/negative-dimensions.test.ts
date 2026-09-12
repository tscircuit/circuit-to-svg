import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib/index"
import type { AnyCircuitElement } from "circuit-json"

test("negative dimensions do not emit negative SVG length attributes", () => {
  const soup: any[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_via",
      pcb_via_id: "via1",
      x: 0,
      y: 0,
      hole_diameter: -1,
      outer_diameter: -2,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "hole1",
      hole_shape: "circle",
      hole_diameter: -2,
      x: 2,
      y: 2,
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout1",
      shape: "circle",
      radius: -1,
      center: { x: 3, y: 3 },
      layers: ["top"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph1",
      shape: "circle",
      hole_diameter: -1,
      outer_diameter: -2,
      x: 4,
      y: 4,
      layers: ["top", "bottom"],
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(soup as any)

  // Ensure no negative r attributes like r="-..."
  expect(svg).not.toMatch(/r="-[0-9]/)
  expect(svg).not.toMatch(/width="-[0-9]/)
  expect(svg).not.toMatch(/height="-[0-9]/)
})
