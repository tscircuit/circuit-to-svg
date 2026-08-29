import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { createDifferentGeneratedWarningsCircuit } from "./schematic-warning-callouts.fixture"

test("different real TSX warnings use distinct callout placements", async () => {
  const { circuitJsonWithWarnings, warningIds, stylingIssueTypes } =
    await createDifferentGeneratedWarningsCircuit()
  const svg = convertCircuitJsonToSchematicSvg(circuitJsonWithWarnings, {
    width: 1400,
    height: 700,
    grid: true,
    shouldDrawWarnings: true,
  })

  expect([...stylingIssueTypes].sort()).toEqual([
    "excessive_bottom_padding",
    "excessive_top_padding",
    "missing_reference_designator_text",
    "ports_outside_body",
  ])
  expect(svg.match(/class="schematic-warning"/g)).toHaveLength(4)
  for (const warningId of warningIds) {
    expect(svg).toContain(`data-warning-id="${warningId}"`)
  }
  expect(svg).not.toContain(">WARNING</text>")
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "different-generated-schematic-warnings",
  )
})
