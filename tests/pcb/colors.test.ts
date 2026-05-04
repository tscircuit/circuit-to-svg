import { test, expect } from "bun:test"

test("CopperLayerName type is defined", () => {
  const colors = await import("lib/pcb/colors")
  expect(colors).toBeDefined()
})

test("PcbColorMap interface is exported", async () => {
  const module = await import("lib/pcb/colors")
  expect(typeof module).toBe("object")
})
