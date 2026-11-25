import { Resvg } from "@resvg/resvg-js"
import { expect, test } from "bun:test"
import { renderPhaseSkewSvg } from "./phase-skew/differential-pair.fixture"
import { renderForumExampleBoard } from "./phase-skew/forum-example-board.fixture"
import { readRgb } from "./phase-skew/joints.fixture"

test("shows the phase skew fade joints on the KiCad forum board", async () => {
  const circuitJson = await renderForumExampleBoard()
  const svg = renderPhaseSkewSvg(circuitJson, {
    width: 1338,
    height: 966,
    viewport: {
      minX: -7.4113,
      minY: 0.2581,
      maxX: -2.0161,
      maxY: 4.1532,
    },
    drawPaddingOutsideBoard: false,
    backgroundColor: "#000",
    layer: "top",
  })

  const image = new Resvg(svg).render()
  // At the negative trace's zero-skew join, the old round cap extended
  // backwards over the preceding ramp and left a visible edge here.
  const before = readRgb({ image, x: 753, y: 467 })
  const atEdge = readRgb({ image, x: 754, y: 466 })
  const after = readRgb({ image, x: 755, y: 465 })
  expect(before[2]).toBe(255)
  for (const index of [0, 1, 2] as const) {
    const channel = before[index]
    expect(Math.abs(channel - atEdge[index])).toBeLessThanOrEqual(2)
    expect(Math.abs(channel - after[index])).toBeLessThanOrEqual(2)
  }

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
