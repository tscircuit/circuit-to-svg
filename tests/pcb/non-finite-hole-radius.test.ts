import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const board = {
  type: "pcb_board",
  pcb_board_id: "board0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
}

const radiiIn = (svg: string, dataType: string) => {
  const group = svg.match(
    new RegExp(`<g data-type="${dataType}"[\\s\\S]*?</g>`),
  )?.[0]
  return [...(group ?? "").matchAll(/ r="([^"]*)"/g)].map((m) => m[1])
}

test('a via with a NaN hole_diameter does not emit r="NaN"', () => {
  // An unparseable unit string (e.g. holeDiameter="abc") reaches the renderer
  // as NaN — see the values tscircuit emits before JSON serialisation.
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_via",
      pcb_via_id: "via0",
      x: 5,
      y: 5,
      outer_diameter: 0.6,
      hole_diameter: Number.NaN,
      layers: ["top", "bottom"],
    },
  ] as any)

  expect(svg).not.toContain('r="NaN"')
  // The valid outer diameter is preserved; only the unusable drill falls back.
  const radii = radiiIn(svg, "pcb_via")
  expect(radii).toHaveLength(2)
  expect(Number(radii[0])).toBeGreaterThan(0)
  expect(radii[1]).toBe("0")
})

test('a plated hole with a NaN hole_diameter does not emit r="NaN"', () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph0",
      shape: "circle",
      x: 5,
      y: 5,
      outer_diameter: 1,
      hole_diameter: Number.NaN,
      layers: ["top", "bottom"],
    },
  ] as any)

  expect(svg).not.toContain('r="NaN"')
})

test("valid via dimensions are still rendered verbatim", () => {
  // Guards against clamping everything to 0.
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_via",
      pcb_via_id: "via0",
      x: 5,
      y: 5,
      outer_diameter: 0.6,
      hole_diameter: 0.3,
      layers: ["top", "bottom"],
    },
  ] as any)

  expect(svg).not.toContain('r="NaN"')

  const radii = radiiIn(svg, "pcb_via").map(Number)
  expect(radii).toHaveLength(2)
  expect(radii[0]).toBeGreaterThan(0)
  expect(radii[1]).toBeGreaterThan(0)
  // outer_diameter is twice hole_diameter, so the radii must keep that ratio.
  expect(radii[0]! / radii[1]!).toBeCloseTo(2, 6)
})

test("valid plated hole dimensions are still rendered verbatim", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph0",
      shape: "circle",
      x: 5,
      y: 5,
      outer_diameter: 1,
      hole_diameter: 0.5,
      layers: ["top", "bottom"],
    },
  ] as any)

  expect(svg).not.toContain('r="NaN"')

  const radii = radiiIn(svg, "pcb_plated_hole").map(Number)
  expect(radii.every((r) => Number.isFinite(r) && r > 0)).toBe(true)
})
