import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { PcbSoldermaskOpening } from "circuit-json"

test("renders circles and rotated rectangles without requiring a board", async () => {
  const circuit: PcbSoldermaskOpening[] = [
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
  ]
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    showSolderMask: true,
    layer: "top",
  })
  expect(svg).not.toContain("NaN")
  expect(svg).toContain("rotate(-45 ")
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "standalone-soldermask-openings-circle-and-rotated-rect",
  )
})
