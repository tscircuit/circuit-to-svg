import { expect, test } from "bun:test"
import {
  expectJointCoverage,
  renderPhaseSkewRoute,
  wire,
} from "./phase-skew/joints.fixture"

test("phase skew covers both corners of a chamfer shorter than the trace width", async () => {
  const { svg, copper, overlay } = await renderPhaseSkewRoute({
    route: [
      wire({ x: -1.5, y: 0 }),
      wire({ x: 0, y: 0 }),
      wire({ x: 0.1, y: 0.1 }),
      wire({ x: 0.1, y: 1.5 }),
    ],
  })
  expectJointCoverage({
    svg,
    copper,
    sample: { x: 206, y: 217 },
    expectedChannel: 170,
  })
  expectJointCoverage({
    svg,
    copper,
    sample: { x: 227, y: 197 },
    expectedChannel: 85,
  })
  const strokes = overlay.filter(({ name }) => name === "path")
  expect(strokes).toHaveLength(3)
  expect(
    strokes.every(({ attributes }) => attributes["stroke-linecap"] === "butt"),
  ).toBe(true)
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
