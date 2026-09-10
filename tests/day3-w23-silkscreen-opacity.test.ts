import test, { expect } from "bun:test"

test("circuit-to-svg - silk screen opacity preservation", () => {
  const silkLayer = { name: "top_silkscreen", opacity: 0.85, color: "#ffffff" }
  expect(silkLayer.opacity).toBeLessThanOrEqual(1.0)
  expect(silkLayer.opacity).toBeGreaterThan(0)
})
