import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("negative via and hole diameters clamp to zero instead of negative SVG attributes", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 40,
      height: 40,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_via",
      pcb_via_id: "via_neg",
      x: 0,
      y: 0,
      outer_diameter: -2,
      hole_diameter: -1,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_neg",
      hole_shape: "circle",
      x: 5,
      y: 5,
      hole_diameter: -2,
    },
  ])

  // Negative radii must not be emitted into SVG length attributes
  expect(result).not.toMatch(/r="-[0-9.]+/)
  expect(result).toContain('class="pcb-hole-outer"')
})
