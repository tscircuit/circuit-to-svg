import { expect, test } from "bun:test"
import {
  pcb_plated_hole,
  type PcbBoard,
  type PcbPlatedHole,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("polygon-pad drills default omitted offsets to zero", () => {
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 28,
    height: 28,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  }
  const shapes = ["circle", "oval", "pill", "rotated_pill"] as const
  const offsets = [{}, { hole_offset_x: 0.75 }, { hole_offset_y: -0.5 }]
  const holes = shapes.flatMap((hole_shape, row) =>
    offsets.map((offset, column) => ({
      type: "pcb_plated_hole" as const,
      shape: "hole_with_polygon_pad" as const,
      pcb_plated_hole_id: `hole_${row}_${column}`,
      x: (column - 1) * 8,
      y: 9 - row * 6,
      hole_shape,
      hole_diameter: 1.5,
      hole_width: 2.5,
      hole_height: 1.5,
      ccw_rotation: 0,
      pad_outline: [
        { x: -2, y: -2 },
        { x: 2, y: -2 },
        { x: 2.5, y: 0 },
        { x: 2, y: 2 },
        { x: -2, y: 2 },
        { x: -2.5, y: 0 },
      ],
      layers: ["top", "bottom"] as const,
      ...offset,
    })),
  )
  // Exercise raw input before the schema supplies its zero-offset defaults.
  const svg = convertCircuitJsonToPcbSvg([
    board,
    ...(holes as unknown as PcbPlatedHole[]),
  ])
  const normalized = convertCircuitJsonToPcbSvg([
    board,
    ...holes.map((hole) => pcb_plated_hole.parse(hole)),
  ])

  expect(svg).not.toContain("NaN")
  expect(svg).toBe(normalized)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
