import { expect, test } from "bun:test"
import { parseSync } from "svgson"
import {
  isPhaseSkewStroke,
  renderDifferentialPair,
  renderPhaseSkewSvg,
} from "./phase-skew/differential-pair.fixture"

test("matched differential pair traces are white", async () => {
  const circuitJson = await renderDifferentialPair({})
  const svg = renderPhaseSkewSvg(circuitJson)
  const objects = parseSync(svg).children
  const strokes = objects.filter(isPhaseSkewStroke)
  expect(strokes.length).toBeGreaterThan(0)
  const copper = objects.find(
    ({ attributes }) => attributes["data-type"] === "pcb_trace",
  )
  expect(copper).toBeDefined()
  for (const { attributes } of strokes) {
    expect(attributes.stroke).toBe("rgb(255, 255, 255)")
    expect(attributes["stroke-linecap"]).toBe("round")
    expect(Number(attributes["stroke-width"])).toBeCloseTo(
      1.1 * Number(copper?.attributes["stroke-width"]),
    )
  }
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
