import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb plated hole with polygon pad respects ccw_rotation", () => {
  const createBoardAndHole = (ccwRotation: number) => [
    {
      type: "pcb_board" as const,
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 40,
      height: 40,
      material: "fr4" as const,
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_plated_hole" as const,
      shape: "hole_with_polygon_pad" as const,
      pcb_plated_hole_id: `hole_polygon_rotated_${ccwRotation}`,
      hole_shape: "circle" as const,
      hole_diameter: 1.0,
      x: 0,
      y: 0,
      hole_offset_x: 2,
      hole_offset_y: 0,
      ccw_rotation: ccwRotation,
      pad_outline: [
        { x: -3, y: -0.5 },
        { x: 3, y: -0.5 },
        { x: 3, y: 0.5 },
        { x: -3, y: 0.5 },
      ],
      layers: ["top", "bottom"],
    },
  ]

  const parseCircleCoords = (svg: string) => {
    const cxMatch =
      svg.match(/cx="([^"]+)"[^>]*class="pcb-hole-inner"/) ??
      svg.match(/class="pcb-hole-inner"[^>]*cx="([^"]+)"/)
    const cyMatch =
      svg.match(/cy="([^"]+)"[^>]*class="pcb-hole-inner"/) ??
      svg.match(/class="pcb-hole-inner"[^>]*cy="([^"]+)"/)
    return {
      cx: Number.parseFloat(cxMatch?.[1] ?? "0"),
      cy: Number.parseFloat(cyMatch?.[1] ?? "0"),
    }
  }

  const parsePolygonPoints = (svg: string) => {
    const match =
      svg.match(/points="([^"]+)"[^>]*class="pcb-hole-outer-pad"/) ??
      svg.match(/class="pcb-hole-outer-pad"[^>]*points="([^"]+)"/)
    return (match?.[1] ?? "").split(" ").map((pair) => {
      const [x, y] = pair.split(",").map(Number.parseFloat)
      return { x, y }
    })
  }

  const unrotatedSvg = convertCircuitJsonToPcbSvg(createBoardAndHole(0))
  const rotated90Svg = convertCircuitJsonToPcbSvg(createBoardAndHole(90))

  expect(unrotatedSvg).toContain('class="pcb-hole-inner"')
  expect(unrotatedSvg).toContain('class="pcb-hole-outer-pad"')
  expect(rotated90Svg).toContain('class="pcb-hole-inner"')
  expect(rotated90Svg).toContain('class="pcb-hole-outer-pad"')

  const unrotatedCircle = parseCircleCoords(unrotatedSvg)
  const rotated90Circle = parseCircleCoords(rotated90Svg)

  // Drill offset rotates from +X (2, 0) at 0 deg to +Y (0, 2) at 90 deg CCW.
  // In SVG coordinates, Y is inverted: cy decreases (offset upward), cx returns to center.
  expect(rotated90Circle.cx).toBeLessThan(unrotatedCircle.cx)
  expect(rotated90Circle.cy).toBeLessThan(unrotatedCircle.cy)

  // Pad outline (6 wide x 1 tall) rotates 90 deg CCW to (1 wide x 6 tall).
  const unrotatedPoints = parsePolygonPoints(unrotatedSvg)
  const rotatedPoints = parsePolygonPoints(rotated90Svg)

  const unrotatedWidth =
    Math.max(...unrotatedPoints.map((p) => p.x)) -
    Math.min(...unrotatedPoints.map((p) => p.x))
  const unrotatedHeight =
    Math.max(...unrotatedPoints.map((p) => p.y)) -
    Math.min(...unrotatedPoints.map((p) => p.y))

  const rotatedWidth =
    Math.max(...rotatedPoints.map((p) => p.x)) -
    Math.min(...rotatedPoints.map((p) => p.x))
  const rotatedHeight =
    Math.max(...rotatedPoints.map((p) => p.y)) -
    Math.min(...rotatedPoints.map((p) => p.y))

  expect(unrotatedWidth).toBeGreaterThan(unrotatedHeight)
  expect(rotatedHeight).toBeGreaterThan(rotatedWidth)
  expect(rotatedWidth).toBeCloseTo(unrotatedHeight, 1)
  expect(rotatedHeight).toBeCloseTo(unrotatedWidth, 1)
})
