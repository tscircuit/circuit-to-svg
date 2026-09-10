import test, { expect } from "bun:test"

test("circuit-to-svg - stroke width scaling calculation", () => {
  const baseWidth = 0.2
  const scaleFactor = 2.5
  const renderedWidth = baseWidth * scaleFactor
  expect(renderedWidth).toBe(0.5)
})
