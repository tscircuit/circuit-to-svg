import { expect, test } from "bun:test"
import { renderFabricationTextBoardSvg } from "tests/fixtures/render-fabrication-text-board-svg"

test("fabrication rotation evidence shares one annotated board", async () => {
  await expect(renderFabricationTextBoardSvg()).toMatchSvgSnapshot(
    import.meta.path,
    "bottom-fabrication-text-mirroring",
  )
})
