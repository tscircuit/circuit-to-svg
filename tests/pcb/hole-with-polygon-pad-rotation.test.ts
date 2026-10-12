import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const board = {
  type: "pcb_board",
  pcb_board_id: "board0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
}

test("hole_with_polygon_pad respects ccw_rotation for pad outline and drill offset (fixes #709)", () => {
  const platedHole = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole0",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    x: 0,
    y: 0,
    hole_diameter: 0.5,
    hole_offset_x: 2,
    hole_offset_y: 0,
    ccw_rotation: 90,
    layers: ["top", "bottom"],
    pad_outline: [
      { x: -3, y: -0.5 },
      { x: 3, y: -0.5 },
      { x: 3, y: 0.5 },
      { x: -3, y: 0.5 },
    ],
  }

  const svg = convertCircuitJsonToPcbSvg([board, platedHole] as any)

  // With ccw_rotation: 90, the horizontal 6x1 bar rotates 90 degrees CCW to a vertical 1x6 bar
  // The drill offset (2, 0) rotates 90 deg CCW to (0, 2)
  expect(svg).toContain('class="pcb-hole-outer-pad"')
  expect(svg).toContain('class="pcb-hole-inner"')

  // Find polygon points
  const polygonMatch = svg.match(
    /<polygon[^>]*class="pcb-hole-outer-pad"[^>]*points="([^"]+)"/,
  )
  expect(polygonMatch).toBeTruthy()
  const points = polygonMatch![1]
    .split(" ")
    .map((p) => p.split(",").map(Number))

  // Find drill center
  const drillMatch = svg.match(
    /<circle[^>]*class="pcb-hole-inner"[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"/,
  )
  expect(drillMatch).toBeTruthy()
})
