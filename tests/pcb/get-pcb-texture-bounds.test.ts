import { test, expect } from "bun:test"
import { getPcbTextureBounds } from "lib"

test("returns panel bounds when panel exists (panel preferred over board)", () => {
  const circuitJson = [
    {
      type: "pcb_panel" as const,
      width: 100,
      height: 100,
      center: { x: 50, y: 50 },
    },
    {
      type: "pcb_board" as const,
      center: { x: 25, y: 25 },
      width: 30,
      height: 30,
    },
    {
      type: "pcb_board" as const,
      center: { x: 75, y: 75 },
      width: 30,
      height: 30,
    },
  ]

  const bounds = getPcbTextureBounds(circuitJson as any)
  expect(bounds).toEqual({ minX: 0, maxX: 100, minY: 0, maxY: 100 })
})

test("falls back to panel bounds when no boards exist", () => {
  const circuitJson = [
    {
      type: "pcb_panel" as const,
      width: 80,
      height: 40,
      center: { x: 10, y: 20 },
    },
  ]

  const bounds = getPcbTextureBounds(circuitJson as any)
  expect(bounds).toEqual({ minX: -30, maxX: 50, minY: 0, maxY: 40 })
})

test("returns board bounds when no panel exists", () => {
  const circuitJson = [
    {
      type: "pcb_board" as const,
      center: { x: 25, y: 25 },
      width: 30,
      height: 30,
    },
    {
      type: "pcb_board" as const,
      center: { x: 75, y: 75 },
      width: 30,
      height: 30,
    },
  ]

  const bounds = getPcbTextureBounds(circuitJson as any)
  expect(bounds).toEqual({ minX: 10, maxX: 90, minY: 10, maxY: 90 })
})

test("throws when no board or panel present", () => {
  expect(() => getPcbTextureBounds([] as any)).toThrow()
})
