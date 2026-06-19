import { expect, test } from "bun:test"
import { colorMap } from "lib/index"

test("exports colorMap from the package entrypoint", () => {
  expect(colorMap.schematic.background).toBe("rgb(245, 241, 237)")
  expect(colorMap.schematic.component_body).toBe("rgb(255, 255, 194)")
  expect(colorMap.schematic.component_outline).toBe("rgb(132, 0, 0)")
})
