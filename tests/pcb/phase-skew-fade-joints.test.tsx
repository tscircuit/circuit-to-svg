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
  const sampleTriples = [
    // The old zero-skew cap extended backwards and left an edge on the ramp.
    [
      { x: 753, y: 467 },
      { x: 754, y: 466 },
      { x: 755, y: 465 },
    ],
    // The same trace changes direction here with matching endpoint skew.
    [
      { x: 422, y: 796 },
      { x: 424, y: 796 },
      { x: 425, y: 795 },
    ],
  ] as const
  for (const [before, center, after] of sampleTriples) {
    const beforeRgb = readRgb({ image, ...before })
    const centerRgb = readRgb({ image, ...center })
    const afterRgb = readRgb({ image, ...after })
    expect(beforeRgb[2]).toBe(255)
    for (const index of [0, 1, 2] as const) {
      expect(Math.abs(beforeRgb[index] - centerRgb[index])).toBeLessThanOrEqual(
        2,
      )
      expect(Math.abs(beforeRgb[index] - afterRgb[index])).toBeLessThanOrEqual(
        2,
      )
    }
  }

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
