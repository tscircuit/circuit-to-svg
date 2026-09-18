import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board_with_voids",
    center: { x: 0, y: 0 },
    width: 24,
    height: 12,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "plated_hole",
    shape: "circle",
    x: -8,
    y: 0,
    outer_diameter: 4,
    hole_diameter: 2,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "via",
    x: -3,
    y: 0,
    outer_diameter: 3,
    hole_diameter: 1.4,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "mounting_hole",
    hole_shape: "circle",
    x: 2,
    y: 0,
    hole_diameter: 3,
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "rectangular_cutout",
    shape: "rect",
    center: { x: 7.5, y: 0 },
    width: 4,
    height: 5,
  },
]

test("drills and cutouts use the SVG background as a void color", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    backgroundColor: "#241638",
    showSolderMask: true,
  })

  expect(svg).not.toContain("#FF26E2")
  expect(svg.match(/fill="#241638"/gu)).toHaveLength(5)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
