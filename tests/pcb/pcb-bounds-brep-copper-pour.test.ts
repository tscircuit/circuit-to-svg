import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// getComprehensivePcbBounds handles rect and polygon copper pours but drops
// brep pours entirely, so a board dominated by a brep pour renders with a
// viewport that ignores the pour's copper.
const brepPourWithMarker: AnyCircuitElement[] = [
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_brep",
    shape: "brep",
    layer: "top",
    covered_with_solder_mask: false,
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -5, y: -5 },
          { x: -5, y: 5 },
          { x: 5, y: 5 },
          { x: 5, y: -5 },
        ],
      },
      inner_rings: [],
    },
  },
  // small marker pad so the scene has at least one counted element
  {
    type: "pcb_smtpad",
    shape: "rect",
    pcb_smtpad_id: "marker_pad",
    x: 0,
    y: 0,
    width: 0.2,
    height: 0.2,
    layer: "top",
  },
]

test("getComprehensivePcbBounds includes a brep copper pour", () => {
  const bounds = getComprehensivePcbBounds(brepPourWithMarker)
  expect(bounds.minX).toBeCloseTo(-5, 6)
  expect(bounds.maxX).toBeCloseTo(5, 6)
  expect(bounds.minY).toBeCloseTo(-5, 6)
  expect(bounds.maxY).toBeCloseTo(5, 6)
})

test("brep copper pour svg viewport snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg(brepPourWithMarker)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
