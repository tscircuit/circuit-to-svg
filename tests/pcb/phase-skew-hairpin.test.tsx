import { expect, test } from "bun:test"
import {
  expectJointCoverage,
  renderPhaseSkewRoute,
  wire,
} from "./phase-skew/joints.fixture"

test("phase skew covers the outside of a 170 degree turn", async () => {
  const { svg, copper, overlay } = await renderPhaseSkewRoute({
    route: [
      wire({ x: -1.5, y: 0 }),
      wire({ x: 0, y: 0 }),
      wire({ x: -1.5, y: 0.2645 }),
    ],
    secondStartJitterMm: 0.5e-6,
  })
  expectJointCoverage({
    svg,
    copper,
    sample: { x: 204, y: 211 },
    expectedChannel: 128,
  })
  expect(overlay.map(({ name }) => name)).toEqual([
    "circle",
    "circle",
    "circle",
    "path",
    "path",
  ])
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
