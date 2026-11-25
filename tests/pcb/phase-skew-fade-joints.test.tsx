import { expect, test } from "bun:test"
import { renderPhaseSkewSvg } from "./phase-skew/differential-pair.fixture"
import { renderForumExampleBoard } from "./phase-skew/forum-example-board.fixture"

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

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
