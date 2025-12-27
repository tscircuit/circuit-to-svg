import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import circuitJson from "./assets/small-boards-in-panel.json"

test("small boards in panel should have dynamically sized anchor offsets", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson as any, {
    showAnchorOffsets: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
