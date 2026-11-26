import { expect, test } from "bun:test"
import { renderFabricationTextBoardSvg } from "tests/fixtures/render-fabrication-text-board-svg"

test("top controls and bottom glyphs retain the board coordinate frame", async () => {
  await expect(
    renderFabricationTextBoardSvg({ layer: "top", view: "top" }),
  ).toMatchSvgSnapshot(import.meta.path, "bottom-fabrication-text-top-control")
  await expect(
    renderFabricationTextBoardSvg({ layer: "bottom", view: "top" }),
  ).toMatchSvgSnapshot(import.meta.path, "bottom-fabrication-text-from-above")
})
