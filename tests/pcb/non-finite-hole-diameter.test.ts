import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

// Regression for tscircuit/circuit-to-svg#634: a via or plated hole whose
// diameter is non-finite (an unparseable value reaches the renderer as NaN on
// the in-memory path tscircuit produces) must not emit r="NaN". A NaN SVG
// length is invalid, so renderers discard the whole <circle> and the drill
// silently disappears. The renderer should omit the invalid circle instead.

const board: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.4,
    num_layers: 2,
    material: "fr4",
  } as any,
]

test("via with non-finite hole_diameter does not emit r=NaN", () => {
  const svg = convertCircuitJsonToPcbSvg([
    ...board,
    {
      type: "pcb_via",
      pcb_via_id: "via_0",
      x: 3,
      y: 3,
      outer_diameter: 0.6,
      hole_diameter: Number.NaN,
      layers: ["top", "bottom"],
    } as any,
  ])

  expect(svg).not.toContain("NaN")
  // the finite outer copper circle still renders; only the invalid drill is dropped
  expect(svg).not.toContain('class="pcb-hole-inner"')
  expect(svg).toContain('class="pcb-hole-outer"')
})

test("circular plated hole with non-finite hole_diameter does not emit r=NaN", () => {
  const svg = convertCircuitJsonToPcbSvg([
    ...board,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_0",
      shape: "circle",
      x: 5,
      y: 5,
      outer_diameter: 1,
      hole_diameter: Number.NaN,
      layers: ["top", "bottom"],
    } as any,
  ])

  expect(svg).not.toContain("NaN")
  expect(svg).not.toContain('class="pcb-hole-inner"')
  expect(svg).toContain('class="pcb-hole-outer"')
})

test("via with finite diameters is unchanged (still renders both circles)", () => {
  const svg = convertCircuitJsonToPcbSvg([
    ...board,
    {
      type: "pcb_via",
      pcb_via_id: "via_1",
      x: 3,
      y: 3,
      outer_diameter: 0.6,
      hole_diameter: 0.3,
      layers: ["top", "bottom"],
    } as any,
  ])

  expect(svg).not.toContain("NaN")
  expect(svg).toContain('class="pcb-hole-outer"')
  expect(svg).toContain('class="pcb-hole-inner"')
})
