import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getPcbBoundsFromCircuitJson } from "lib/pcb/get-pcb-bounds-from-circuit-json"

test("getPcbBoundsFromCircuitJson includes pcb_courtyard_circle, outline, and polygon", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_courtyard_circle",
      pcb_courtyard_circle_id: "cc1",
      pcb_component_id: "comp1",
      center: { x: -10, y: 0 },
      radius: 3,
      layer: "top",
    },
    {
      type: "pcb_courtyard_outline",
      pcb_courtyard_outline_id: "co1",
      pcb_component_id: "comp2",
      layer: "top",
      outline: [
        { x: 0, y: -5 },
        { x: 4, y: -5 },
        { x: 4, y: 2 },
      ],
    },
    {
      type: "pcb_courtyard_polygon",
      pcb_courtyard_polygon_id: "cp1",
      pcb_component_id: "comp3",
      layer: "top",
      points: [
        { x: 8, y: 1 },
        { x: 14, y: 1 },
        { x: 11, y: 9 },
      ],
    },
  ]

  const bounds = getPcbBoundsFromCircuitJson(soup)

  expect(bounds.minX).toBe(-13)
  expect(bounds.minY).toBe(-5)
  expect(bounds.maxX).toBe(14)
  expect(bounds.maxY).toBe(9)
})
