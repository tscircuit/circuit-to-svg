import { expect, test } from "bun:test"
import { renderFabricationTextBoardSvg } from "tests/fixtures/render-fabrication-text-board-svg"

test("bottom fabrication notes show absolute anchors and text bounds", async () => {
  await expect(renderFabricationTextBoardSvg()).toMatchSvgSnapshot(
    import.meta.path,
    "bottom-fabrication-text-mirroring",
  )
})
