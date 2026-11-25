import { expect, test } from "bun:test"
import {
  expectJointCoverage,
  renderPhaseSkewRoute,
  wire,
} from "./phase-skew/joints.fixture"

test("phase skew covers the wider trace at a neck-down", async () => {
  const { svg, copper, overlay } = await renderPhaseSkewRoute({
    route: [
      wire({ x: -1.5, y: 0, width: 0.6 }),
      wire({ x: 0, y: 0, width: 0.2 }),
      wire({ x: 0, y: 1.5, width: 0.2 }),
    ],
  })
  expectJointCoverage({
    svg,
    copper,
    sample: { x: 224, y: 214 },
    expectedChannel: 128,
  })
  const joint = overlay.find(
    ({ name, attributes }) =>
      name === "circle" && attributes.cx === "200" && attributes.cy === "200",
  )
  if (!joint) throw new Error("Expected a phase-skew fill at the neck-down")
  expect(Number(joint.attributes.r)).toBeCloseTo(33)
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
