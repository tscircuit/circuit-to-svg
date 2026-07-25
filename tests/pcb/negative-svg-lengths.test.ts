import { expect, test } from "bun:test"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "lib"

const board = {
  type: "pcb_board",
  pcb_board_id: "board0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
}

// Per the SVG spec a negative `r`, `width` or `height` is an error and the shape
// is not rendered, so these must never reach the output.
const negativeLengthsIn = (svg: string) => [
  ...new Set(
    [...svg.matchAll(/ (r|width|height)="(-[\d.]+)"/g)].map(
      (m) => `${m[1]}=${m[2]}`,
    ),
  ),
]

const radiiIn = (svg: string, dataType: string) => {
  const group = svg.match(
    new RegExp(`<g data-type="${dataType}"[\\s\\S]*?</g>`),
  )?.[0]
  return [...(group ?? "").matchAll(/ r="([^"]*)"/g)].map((m) => Number(m[1]))
}

test("a negative via diameter does not emit a negative radius", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_via",
      pcb_via_id: "via0",
      x: 3,
      y: 3,
      outer_diameter: -2,
      hole_diameter: -1,
      layers: ["top", "bottom"],
    },
  ] as any)

  expect(negativeLengthsIn(svg)).toEqual([])
})

test("a negative plated hole diameter does not emit a negative radius", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph0",
      shape: "circle",
      x: 3,
      y: 3,
      outer_diameter: -2,
      hole_diameter: -1,
      layers: ["top", "bottom"],
    },
  ] as any)

  expect(negativeLengthsIn(svg)).toEqual([])
})

test("a negative unplated hole diameter does not emit a negative radius", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole0",
      hole_shape: "circle",
      hole_diameter: -2,
      x: 3,
      y: 3,
    },
  ] as any)

  expect(negativeLengthsIn(svg)).toEqual([])
})

test("a negative keepout radius does not emit a negative radius", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout0",
      shape: "circle",
      center: { x: 3, y: 3 },
      radius: -1,
      layers: ["top"],
    },
  ] as any)

  expect(negativeLengthsIn(svg)).toEqual([])
})

test("a negative schematic component size does not emit a negative width", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_component",
      schematic_component_id: "sc1",
      center: { x: 0, y: 0 },
      rotation: 0,
      size: { width: -4, height: 1 },
      pin_spacing: 0.2,
      port_labels: {},
      source_component_id: "src1",
    },
    {
      type: "source_component",
      source_component_id: "src1",
      ftype: "simple_chip",
      name: "U1",
    },
  ] as any)

  expect(negativeLengthsIn(svg)).toEqual([])
})

test("valid dimensions are still rendered verbatim", () => {
  // Guards against clamping every length to zero.
  const svgFor = (outer: number, hole: number) =>
    convertCircuitJsonToPcbSvg([
      board,
      {
        type: "pcb_via",
        pcb_via_id: "via0",
        x: 3,
        y: 3,
        outer_diameter: outer,
        hole_diameter: hole,
        layers: ["top", "bottom"],
      },
    ] as any)

  const radii = radiiIn(svgFor(0.6, 0.3), "pcb_via")

  expect(radii).toHaveLength(2)
  expect(radii[0]).toBeGreaterThan(0)
  expect(radii[1]).toBeGreaterThan(0)
  // outer_diameter is twice hole_diameter, so the radii must keep that ratio.
  expect(radii[0]! / radii[1]!).toBeCloseTo(2, 6)
})
