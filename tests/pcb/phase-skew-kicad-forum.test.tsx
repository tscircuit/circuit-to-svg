import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { renderForumExampleBoard } from "./phase-skew/forum-example-board.fixture"

test("shows phase skew on the upper pair of the KiCad forum board", async () => {
  const circuitJson = await renderForumExampleBoard()
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    width: 800,
    height: 440,
    showDifferentialPairPhaseSkew: true,
  })

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
