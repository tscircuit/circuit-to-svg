import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb plated hole with polygon pad respects ccw_rotation", () => {
  const createBoardAndHole = (ccwRotation: number) => [
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
      type: "pcb_plated_hole",
      shape: "hole_with_polygon_pad",
      pcb_plated_hole_id: `hole_polygon_rotated_${ccwRotation}`,
      hole_shape: "circle",
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

  const parsePolygonPoints = (svg: string): { x: number; y: number }[] => {
    const match =
      svg.match(/points="([^"]+)"[^>]*class="pcb-hole-outer-pad"/) ??
      svg.match(/class="pcb-hole-outer-pad"[^>]*points="([^"]+)"/)
    return (match?.[1] ?? "").split(" ").map((pair) => {
      const parts = pair.split(",")
      const x = Number.parseFloat(parts[0] ?? "0")
      const y = Number.parseFloat(parts[1] ?? "0")
      return { x, y }
    })
  }

  const unrotatedSvg = convertCircuitJsonToPcbSvg(createBoardAndHole(0) as any)
  const rotated90Svg = convertCircuitJsonToPcbSvg(createBoardAndHole(90) as any)

  expect(unrotatedSvg).toContain('class="pcb-hole-inner"')
  expect(unrotatedSvg).toContain('class="pcb-hole-outer-pad"')
  expect(rotated90Svg).toContain('class="pcb-hole-inner"')
  expect(rotated90Svg).toContain('class="pcb-hole-outer-pad"')

  const unrotatedCircle = parseCircleCoords(unrotatedSvg)
  const rotated90Circle = parseCircleCoords(rotated90Svg)

  expect(rotated90Circle.cx).toBeLessThan(unrotatedCircle.cx)
  expect(rotated90Circle.cy).toBeLessThan(unrotatedCircle.cy)

  const unrotatedPoints = parsePolygonPoints(unrotatedSvg)
  const rotatedPoints = parsePolygonPoints(rotated90Svg)

  const unrotatedXs = unrotatedPoints.map((p) => p.x)
  const unrotatedYs = unrotatedPoints.map((p) => p.y)
  const unrotatedWidth = Math.max(...unrotatedXs) - Math.min(...unrotatedXs)
  const unrotatedHeight = Math.max(...unrotatedYs) - Math.min(...unrotatedYs)

  const rotatedXs = rotatedPoints.map((p) => p.x)
  const rotatedYs = rotatedPoints.map((p) => p.y)
  const rotatedWidth = Math.max(...rotatedXs) - Math.min(...rotatedXs)
  const rotatedHeight = Math.max(...rotatedYs) - Math.min(...rotatedYs)

  expect(unrotatedWidth).toBeGreaterThan(unrotatedHeight)
  expect(rotatedHeight).toBeGreaterThan(rotatedWidth)
  expect(rotatedWidth).toBeCloseTo(unrotatedHeight, 1)
  expect(rotatedHeight).toBeCloseTo(unrotatedWidth, 1)
})
