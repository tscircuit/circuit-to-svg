import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
} as AnyCircuitElement

/**
 * Per the SVG spec a negative `r`, `width` or `height` is an error and the
 * shape must not be rendered, and NaN/Infinity are not lengths at all. Either
 * way the element silently disappears instead of merely looking wrong, so no
 * length attribute may ever carry one of these values.
 */
const INVALID_LENGTH =
  /(?:^|\s)(?:r|rx|ry|width|height)="(-[\d.]+|-?Infinity|NaN)"/g

const findInvalidLengths = (svg: string): string[] => [
  ...new Set([...svg.matchAll(INVALID_LENGTH)].map((m) => m[0].trim())),
]

test("negative via diameters do not emit negative SVG lengths", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_via",
      pcb_via_id: "via0",
      x: 3,
      y: 3,
      hole_diameter: -1,
      outer_diameter: -2,
      layers: ["top", "bottom"],
    } as AnyCircuitElement,
  ])

  expect(findInvalidLengths(svg)).toEqual([])
})

test("negative hole diameter does not emit a negative SVG length", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole0",
      x: 2,
      y: 2,
      hole_shape: "circle",
      hole_diameter: -2,
    } as AnyCircuitElement,
  ])

  expect(findInvalidLengths(svg)).toEqual([])
})

test("negative plated hole diameters do not emit negative SVG lengths", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph0",
      x: -3,
      y: -3,
      shape: "circle",
      hole_diameter: -1,
      outer_diameter: -2,
      layers: ["top", "bottom"],
    } as AnyCircuitElement,
  ])

  expect(findInvalidLengths(svg)).toEqual([])
})

test("negative keepout radius does not emit a negative SVG length", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_keepout",
      pcb_keepout_id: "ko0",
      center: { x: 0, y: 5 },
      shape: "circle",
      radius: -1,
      layers: ["top"],
    } as AnyCircuitElement,
  ])

  expect(findInvalidLengths(svg)).toEqual([])
})

test("non-finite via diameters do not emit NaN or Infinity radii", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_via",
      pcb_via_id: "via_nan",
      x: 0,
      y: 0,
      hole_diameter: Number.NaN,
      outer_diameter: Number.POSITIVE_INFINITY,
      layers: ["top", "bottom"],
    } as AnyCircuitElement,
  ])

  // Scoped to the radii this conversion owns. A non-finite dimension also
  // poisons the viewport transform, which leaves NaN in `cx`/`cy` and in the
  // board outline; that is a separate defect in the bounds calculation and is
  // deliberately not addressed here.
  const viaRadii = [...svg.matchAll(/data-type="pcb_via"/g)].length
  expect(viaRadii).toBeGreaterThan(0)
  expect(svg).not.toMatch(/r="(-[\d.]+|-?Infinity|NaN)"/)
})

test("valid dimensions still render their lengths unchanged", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    {
      type: "pcb_via",
      pcb_via_id: "via_ok",
      x: 0,
      y: 0,
      hole_diameter: 0.4,
      outer_diameter: 0.8,
      layers: ["top", "bottom"],
    } as AnyCircuitElement,
  ])

  expect(findInvalidLengths(svg)).toEqual([])
  // a positive radius must survive untouched, otherwise the clamp is too eager
  expect(svg).toMatch(/class="pcb-hole-outer"[^>]*r="[\d.]+"/)
})
