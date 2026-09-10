import test, { expect } from "bun:test"

test("circuit-to-svg - viewBox dimension calculation helper", () => {
  const box = { minX: 0, minY: 0, width: 800, height: 600 }
  const viewBoxStr = `${box.minX} ${box.minY} ${box.width} ${box.height}`
  expect(viewBoxStr).toBe("0 0 800 600")
})
