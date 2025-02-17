import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen rect shape", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_rect",
      layer: "top" as const,
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_rect_id: "rect_1",
      center: { x: 2, y: 3 },
      width: 4,
      height: 2,
    },
    {
      type: "pcb_silkscreen_rect",
      layer: "bottom" as const,
      pcb_component_id: "pcb_component_2",
      pcb_silkscreen_rect_id: "rect_2",
      center: { x: -1, y: -2 },
      width: 3,
      height: 1,
    },
    {
      type: "pcb_silkscreen_rect",
      layer: "top" as const,
      pcb_component_id: "pcb_component_3",
      pcb_silkscreen_rect_id: "rect_3",
      center: { x: 5, y: 7 },
      width: 2,
      height: 3,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
