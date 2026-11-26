import { expect, test } from "bun:test"
import { renderFabricationTextRotationComparison } from "tests/fixtures/render-fabrication-text-rotation-comparison"

test("fixed-origin top and bottom views distinguish 90 from 270 degrees", async () => {
  await expect(renderFabricationTextRotationComparison()).toMatchSvgSnapshot(
    import.meta.path,
    "bottom-fabrication-text-rotation-comparison",
  )
})
