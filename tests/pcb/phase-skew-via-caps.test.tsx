import { expect, test } from "bun:test"
import { renderPhaseSkewRoute, wire } from "./phase-skew/joints.fixture"

test("phase skew ends and restarts with round caps at a via", async () => {
  const { svg, overlay } = await renderPhaseSkewRoute({
    route: [
      wire({ x: -1.5, y: -0.5 }),
      wire({ x: -0.8, y: 0 }),
      { route_type: "via", x: 0, y: 0, from_layer: "top", to_layer: "bottom" },
      wire({ x: 0.8, y: 0, layer: "bottom" }),
      wire({ x: 1.5, y: 0.5, layer: "bottom" }),
    ],
  })
  const caps = overlay.filter(
    ({ name, attributes }) =>
      name === "circle" && attributes.cx === "200" && attributes.cy === "200",
  )
  expect(caps.map(({ attributes }) => attributes["data-pcb-layer"])).toEqual([
    "bottom",
    "top",
  ])
  for (const { attributes } of caps) {
    expect(attributes.fill).toBe("rgb(50%, 50%, 100%)")
    expect(Number(attributes.r)).toBeCloseTo(22)
  }
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
