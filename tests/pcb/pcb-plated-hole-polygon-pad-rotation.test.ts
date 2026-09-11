import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

const board = {
  type: "pcb_board" as const,
  pcb_board_id: "board_0",
  center: { x: 0, y: 0 },
  width: 40,
  height: 40,
  material: "fr4" as const,
  num_layers: 2,
  thickness: 1.6,
}

const makePolygonPadHole = (
  pcb_plated_hole_id: string,
  ccw_rotation: number | undefined,
  hole_offset_x = 0,
  hole_offset_y = 0,
) => ({
  type: "pcb_plated_hole" as const,
  shape: "hole_with_polygon_pad" as const,
  pcb_plated_hole_id,
  hole_shape: "circle" as const,
  hole_diameter: 1,
  x: 0,
  y: 0,
  hole_offset_x,
  hole_offset_y,
  pad_outline: [
    { x: -3, y: -0.5 },
    { x: 3, y: -0.5 },
    { x: 3, y: 0.5 },
    { x: -3, y: 0.5 },
  ],
  layers: ["top", "bottom"] as ("top" | "bottom")[],
  ...(ccw_rotation === undefined ? {} : { ccw_rotation }),
})

const parsePoints = (pointsAttr: string): Array<[number, number]> =>
  pointsAttr
    .split(" ")
    .map((pair) => pair.split(",").map(Number) as [number, number])

test("polygon pad renders rotated by ccw_rotation about the hole position", () => {
  const result = convertCircuitJsonToPcbSvg([
    board,
    makePolygonPadHole("hole1", 90, 2, 0),
  ])

  const polygon = result.match(
    /<polygon class="pcb-hole-outer-pad"[^>]*points="([^"]+)"/,
  )
  expect(polygon).not.toBeNull()

  // A 6x1 bar rotated 90 degrees must be taller than it is wide
  const points = parsePoints(polygon![1]!)
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const width = Math.max(...xs) - Math.min(...xs)
  const height = Math.max(...ys) - Math.min(...ys)
  expect(height).toBeGreaterThan(width)

  // Hole offset (2, 0) rotates to (0, 2) in circuit space; with the y-flip
  // the drill renders below the pad center and horizontally centered
  const circle = result.match(
    /<circle class="pcb-hole-inner"[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"/,
  )
  expect(circle).not.toBeNull()
  const padCenterX = xs.reduce((a, b) => a + b, 0) / xs.length
  const padCenterY = ys.reduce((a, b) => a + b, 0) / ys.length
  expect(Math.abs(Number(circle![1]) - padCenterX)).toBeLessThan(0.01)
  expect(Number(circle![2])).toBeLessThan(padCenterY)
})

test("polygon pad without ccw_rotation is unchanged", () => {
  const result = convertCircuitJsonToPcbSvg([
    board,
    makePolygonPadHole("hole1", undefined),
  ])

  const polygon = result.match(
    /<polygon class="pcb-hole-outer-pad"[^>]*points="([^"]+)"/,
  )
  expect(polygon).not.toBeNull()
  const points = parsePoints(polygon![1]!)
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const width = Math.max(...xs) - Math.min(...xs)
  const height = Math.max(...ys) - Math.min(...ys)
  expect(width).toBeGreaterThan(height)
})

test("pcb bounds account for polygon pad rotation", () => {
  const circuitJson = [makePolygonPadHole("hole1", 90)] as any

  const bounds = getComprehensivePcbBounds(circuitJson)
  expect(bounds).not.toBeNull()

  // The unrotated 6x1 bar spans x: [-3, 3], y: [-0.5, 0.5]; rotated 90
  // degrees it spans x: [-0.5, 0.5], y: [-3, 3]
  expect(bounds!.minX).toBeCloseTo(-0.5, 1)
  expect(bounds!.maxX).toBeCloseTo(0.5, 1)
  expect(bounds!.minY).toBeCloseTo(-3, 1)
  expect(bounds!.maxY).toBeCloseTo(3, 1)
})
