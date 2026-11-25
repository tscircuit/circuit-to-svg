import { expect, test } from "bun:test"
import { renderPhaseSkewSvg } from "./phase-skew/differential-pair.fixture"
import { renderForumExampleBoard } from "./phase-skew/forum-example-board.fixture"

test("shows phase skew on the upper pair of the KiCad forum board", async () => {
  const circuitJson = await renderForumExampleBoard()
  const svg = renderPhaseSkewSvg(circuitJson, { height: 440 })

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
