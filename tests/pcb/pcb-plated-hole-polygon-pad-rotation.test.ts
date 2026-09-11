import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

// 6mm x 1mm bar with the drill offset to the right end; rotated 90deg ccw it
// must become a vertical bar with the drill at the top end.
const bar = {
  type: "pcb_plated_hole",
  shape: "hole_with_polygon_pad",
  pcb_plated_hole_id: "hole_polygon_rotated",
  hole_shape: "circle",
  hole_diameter: 0.8,
  x: 0,
  y: 0,
  hole_offset_x: 2,
  hole_offset_y: 0,
  pad_outline: [
    { x: -3, y: -0.5 },
    { x: 3, y: -0.5 },
    { x: 3, y: 0.5 },
    { x: -3, y: 0.5 },
  ],
  layers: ["top", "bottom"],
} as const

const board = {
  type: "pcb_board",
  pcb_board_id: "board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  material: "fr4",
  num_layers: 2,
  thickness: 1.6,
} as const

const getPadPolygonPoints = (svg: string) => {
  const match = svg.match(
    /<polygon class="pcb-hole-outer-pad"[^>]*points="([^"]+)"[^>]*data-type="pcb_plated_hole"/,
  )
  if (!match) throw new Error("no pad polygon found")
  return match[1]!.split(" ").map((pair) => pair.split(",").map(Number))
}

const getDrillCenter = (svg: string) => {
  const match = svg.match(
    /<circle class="pcb-hole-inner"[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"[^>]*data-type="pcb_plated_hole_drill"/,
  )
  if (!match) throw new Error("no drill found")
  return { cx: Number(match[1]), cy: Number(match[2]) }
}

test("polygon pad plated hole follows ccw_rotation", () => {
  const unrotated = convertCircuitJsonToPcbSvg([board, bar] as any)
  const rotated = convertCircuitJsonToPcbSvg([
    board,
    { ...bar, ccw_rotation: 90 },
  ] as any)

  const unrotatedPoints = getPadPolygonPoints(unrotated)
  const rotatedPoints = getPadPolygonPoints(rotated)

  const width = (pts: number[][]) =>
    Math.max(...pts.map((p) => p[0]!)) - Math.min(...pts.map((p) => p[0]!))
  const height = (pts: number[][]) =>
    Math.max(...pts.map((p) => p[1]!)) - Math.min(...pts.map((p) => p[1]!))

  // horizontal bar becomes a vertical bar of the same size
  expect(width(unrotatedPoints)).toBeCloseTo(height(rotatedPoints), 3)
  expect(height(unrotatedPoints)).toBeCloseTo(width(rotatedPoints), 3)
  expect(width(unrotatedPoints)).toBeGreaterThan(height(unrotatedPoints))

  // the drill offset rotates with the pad: it was to the right, now it is above
  const drillBefore = getDrillCenter(unrotated)
  const drillAfter = getDrillCenter(rotated)
  const padCenterX =
    (Math.max(...unrotatedPoints.map((p) => p[0]!)) +
      Math.min(...unrotatedPoints.map((p) => p[0]!))) /
    2
  const padCenterY =
    (Math.max(...unrotatedPoints.map((p) => p[1]!)) +
      Math.min(...unrotatedPoints.map((p) => p[1]!))) /
    2
  expect(drillBefore.cx).toBeGreaterThan(padCenterX)
  expect(drillBefore.cy).toBeCloseTo(padCenterY, 3)
  expect(drillAfter.cx).toBeCloseTo(padCenterX, 3)
  expect(drillAfter.cy).toBeLessThan(padCenterY) // SVG Y axis points down

  expect(rotated).toMatchSvgSnapshot(import.meta.path)
})
