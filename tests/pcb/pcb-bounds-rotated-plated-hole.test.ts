import { expect, test } from "bun:test"
import type { PcbPlatedHole } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

const rotatedHoles: PcbPlatedHole[] = [
  {
    type: "pcb_plated_hole",
    shape: "oval",
    pcb_plated_hole_id: "oval",
    x: 2,
    y: -1,
    outer_width: 8,
    outer_height: 2,
    hole_width: 6,
    hole_height: 1,
    ccw_rotation: 90,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    shape: "pill",
    pcb_plated_hole_id: "pill",
    x: 2,
    y: -1,
    outer_width: 8,
    outer_height: 2,
    hole_width: 6,
    hole_height: 1,
    ccw_rotation: 90,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    shape: "circular_hole_with_rect_pad",
    pcb_plated_hole_id: "rect-pad",
    x: 2,
    y: -1,
    hole_shape: "circle",
    pad_shape: "rect",
    hole_diameter: 1,
    rect_pad_width: 8,
    rect_pad_height: 2,
    hole_offset_x: 0,
    hole_offset_y: 0,
    rect_ccw_rotation: 90,
    layers: ["top", "bottom"],
  },
]

for (const hole of rotatedHoles) {
  test(`PCB bounds contain a rotated ${hole.shape} plated hole`, () => {
    const bounds = getComprehensivePcbBounds([hole])

    expect(bounds.minX).toBeCloseTo(1)
    expect(bounds.maxX).toBeCloseTo(3)
    expect(bounds.minY).toBeCloseTo(-5)
    expect(bounds.maxY).toBeCloseTo(3)
    expect(bounds.hasBounds).toBe(true)
    expect(convertCircuitJsonToPcbSvg([hole])).toMatchSvgSnapshot(
      import.meta.path,
      `pcb-bounds-rotated-${hole.shape}`,
    )
  })
}

test("PCB bounds contain the corners of a diagonal rectangular plated pad", () => {
  const hole = rotatedHoles.find(
    (hole) => hole.shape === "circular_hole_with_rect_pad",
  )!
  const diagonalHole = { ...hole, rect_ccw_rotation: 45 }
  const bounds = getComprehensivePcbBounds([diagonalHole])

  expect(bounds.minX).toBeCloseTo(-1.535534)
  expect(bounds.maxX).toBeCloseTo(5.535534)
  expect(bounds.minY).toBeCloseTo(-4.535534)
  expect(bounds.maxY).toBeCloseTo(2.535534)
  expect(convertCircuitJsonToPcbSvg([diagonalHole])).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-bounds-diagonal-rect-plated-pad",
  )
})
