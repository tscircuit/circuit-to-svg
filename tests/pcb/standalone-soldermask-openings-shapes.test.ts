import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"
import { silkText } from "../fixtures/standalone-soldermask-openings"

test("renders circles and rotated rectangles without requiring a board", async () => {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_soldermask_opening",
      pcb_soldermask_opening_id: "circle",
      shape: "circle",
      layer: "top",
      x: -2,
      y: 0,
      radius: 1,
    },
    {
      type: "pcb_soldermask_opening",
      pcb_soldermask_opening_id: "rotated",
      shape: "rotated_rect",
      layer: "top",
      x: 2,
      y: 0,
      width: 3,
      height: 1,
      ccw_rotation: 45,
    },
    silkText(
      "shapes-title",
      "OPENING SHAPES (NO BOARD RECORD)",
      0,
      3,
      "top",
      0.4,
    ),
    silkText("circle-label", "CIRCLE: radius 1mm", -2, -2, "top", 0.3),
    silkText("rect-label", "RECT: 3x1mm, 45deg", 2, -2, "top", 0.3),
    silkText(
      "shapes-legend",
      "Tan = mask opening over substrate. No copper is added.",
      0,
      -3,
      "top",
      0.28,
    ),
  ]
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
    layer: "top",
    width: 900,
    height: 660,
    viewport: { minX: -6, minY: -4.4, maxX: 6, maxY: 4.4 },
  })
  expect(svg).not.toContain("NaN")
  expect(svg).toContain("rotate(-45 ")
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "standalone-soldermask-openings-circle-and-rotated-rect",
  )
})
