import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("silkscreen circle shape", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_circle",
      layer: "top" as const,
      pcb_component_id: "pcb_component_1",
      pcb_silkscreen_circle_id: "circle_1",
      center: { x: 2, y: 3 },
      radius: 1.5,
    },
    {
      type: "pcb_silkscreen_circle",
      layer: "bottom" as const,
      pcb_component_id: "pcb_component_2",
      pcb_silkscreen_circle_id: "circle_2",
      center: { x: -2, y: -3 },
      radius: 2,
    },
    {
      type: "pcb_silkscreen_circle",
      layer: "top" as const,
      pcb_component_id: "pcb_component_3",
      pcb_silkscreen_circle_id: "circle_3",
      center: { x: 3, y: 4 },
      radius: 1,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
