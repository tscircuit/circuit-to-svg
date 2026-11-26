import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync } from "svgson"
import {
  isPhaseSkewStroke,
  PHASE_SKEW_SVG_SIZE,
  renderDifferentialPair,
  renderPhaseSkewSvg,
  TUNING_BUMP,
} from "./phase-skew/differential-pair.fixture"

test("the tuning bump produces blue and red gradients when enabled", async () => {
  const circuitJson = await renderDifferentialPair({
    positivePath: TUNING_BUMP,
  })
  const before = convertCircuitJsonToPcbSvg(circuitJson, PHASE_SKEW_SVG_SIZE)
  const after = renderPhaseSkewSvg(circuitJson)
  expect(
    renderPhaseSkewSvg(circuitJson, { showDifferentialPairPhaseSkew: false }),
  ).toBe(before)
  expect(parseSync(before).children.filter(isPhaseSkewStroke)).toHaveLength(0)

  const gradients = getSvgGradients(after)
  expect(gradients.length).toBeGreaterThan(0)
  const gradientIds = new Set(gradients.map(({ attributes }) => attributes.id))
  expect(gradientIds.size).toBe(gradients.length)
  expect(renderPhaseSkewSvg(circuitJson)).toBe(after)
  for (const options of [{ width: 850 }, { phaseSkewIdPrefix: "second" }]) {
    const otherSvg = renderPhaseSkewSvg(circuitJson, options)
    const otherIds = new Set(
      getSvgGradients(otherSvg).map(({ attributes }) => attributes.id),
    )
    expect([...gradientIds].filter((id) => otherIds.has(id))).toEqual([])
  }
  for (const { attributes, children } of gradients) {
    expect(attributes.gradientUnits).toBe("userSpaceOnUse")
    expect(children.map(({ attributes }) => attributes.offset)).toEqual([
      "0",
      "1",
    ])
  }
  const colors = gradients.flatMap(({ children }) =>
    children.map(({ attributes }) => attributes["stop-color"]),
  )
  expect(colors).toContain("rgb(255, 255, 255)")
  expect(colors).toContain("rgb(0, 0, 255)")
  expect(colors).toContain("rgb(255, 0, 0)")

  await expect(before).toMatchSvgSnapshot(
    import.meta.path,
    "phase-skew-tuning-bump-before",
  )
  await expect(after).toMatchSvgSnapshot(
    import.meta.path,
    "phase-skew-tuning-bump-after",
  )
})

function getSvgGradients(svg: string) {
  return parseSync(svg)
    .children.filter(({ name }) => name === "defs")
    .flatMap(({ children }) =>
      children.filter(({ name }) => name === "linearGradient"),
    )
}
