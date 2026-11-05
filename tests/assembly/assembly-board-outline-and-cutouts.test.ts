import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToPinoutSvg,
} from "lib/index"

test("assembly SVG computes viewport bounds from pcb_board outline when width/height are absent", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 0,
      height: 0,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      outline: [
        { x: -20, y: -10 },
        { x: 20, y: -10 },
        { x: 20, y: 10 },
        { x: -20, y: 10 },
      ],
    },
  ]

  const svg = convertCircuitJsonToAssemblySvg(circuitJson, {
    width: 800,
    height: 600,
  })

  // Without outline bounds, minX === maxX === 0 and boundary width is 800;
  // with outline bounds (-20..20 x -10..10), the 40x20 board scales to fit 800x600.
  const boundaryMatch = svg.match(
    /<rect class="assembly-boundary"[^>]*width="([^"]+)"[^>]*height="([^"]+)"/,
  )
  expect(boundaryMatch).not.toBeNull()
  const boundaryWidth = Number(boundaryMatch![1])
  const boundaryHeight = Number(boundaryMatch![2])
  expect(boundaryWidth).toBeGreaterThan(700)
  expect(boundaryHeight).toBeGreaterThan(350)
  expect(boundaryWidth / boundaryHeight).toBeCloseTo(2, 1)
})

test("pinout and assembly SVGs render circle, polygon, and rotated rect board cutouts", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout_circle",
      shape: "circle",
      center: { x: -8, y: 0 },
      radius: 2,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout_polygon",
      shape: "polygon",
      points: [
        { x: 0, y: -3 },
        { x: 3, y: 0 },
        { x: 0, y: 3 },
      ],
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout_rect_rot",
      shape: "rect",
      center: { x: 8, y: 0 },
      width: 4,
      height: 2,
      rotation: 90,
    },
  ]

  const pinoutSvg = convertCircuitJsonToPinoutSvg(circuitJson)
  const assemblySvg = convertCircuitJsonToAssemblySvg(circuitJson)

  for (const [svg, boardClass] of [
    [pinoutSvg, "pinout-board"],
    [assemblySvg, "pcb-board"],
  ] as const) {
    const pathMatch = svg.match(
      new RegExp(`<path class="${boardClass}" d="([^"]+)"`),
    )
    expect(pathMatch).not.toBeNull()
    const d = pathMatch![1]!

    // Circle cutout emits two SVG arc commands (A r r 0 1 0 ...)
    expect(d).toMatch(/A\s+[\d.]+\s+[\d.]+\s+0\s+1\s+0/)

    // Outer board + 3 cutouts (circle, polygon, rotated rect) => 4 closed subpaths
    const zCount = (d.match(/Z/g) ?? []).length
    expect(zCount).toBe(4)
  }
})
