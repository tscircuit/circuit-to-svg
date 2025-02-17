import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen line shape", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_line",
      layer: "top" as const,
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_line_id: "line_1",
      x1: 0,
      y1: 0,
      x2: 5,
      y2: 5,
      stroke_width: 0.2,
    },
    {
      type: "pcb_silkscreen_line",
      layer: "bottom" as const,
      pcb_component_id: "pcb_component_2",
      pcb_silkscreen_line_id: "line_2",
      x1: -3,
      y1: -3,
      x2: -1,
      y2: -1,
      stroke_width: 0.3,
    },
    {
      type: "pcb_silkscreen_line",
      layer: "top" as const,
      pcb_component_id: "pcb_component_3",
      pcb_silkscreen_line_id: "line_3",
      x1: 1,
      y1: 2,
      x2: 4,
      y2: 3,
      stroke_width: 0.1,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
