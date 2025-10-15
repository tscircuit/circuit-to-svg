import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("pcb cutout polygon influences bounds", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_cutout",
      pcb_cutout_id: "pcb_cutout_polygon_bounds",
      shape: "polygon",
      points: [
        { x: 100, y: 100 },
        { x: 120, y: 110 },
        { x: 110, y: 130 },
      ],
    },
  ])

  expect(result.includes("NaN")).toBeFalse()
  expect(result).toMatchSvgSnapshot(import.meta.path)
})
