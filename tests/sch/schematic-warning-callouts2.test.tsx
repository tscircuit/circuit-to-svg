import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { createMissingRefdesWarningCircuit } from "./schematic-warning-callouts.fixture"

test("shouldDrawWarnings places a real TSX warning around its component", async () => {
  const { circuitJsonWithWarning, warningMessage, warningId } =
    await createMissingRefdesWarningCircuit()
  const svg = convertCircuitJsonToSchematicSvg(circuitJsonWithWarning, {
    width: 800,
    height: 500,
    grid: true,
    shouldDrawWarnings: true,
  })

  expect(svg).toContain('data-type="schematic_component_styling_warning"')
  expect(svg).toContain(`data-warning-id="${warningId}"`)
  expect(svg).toContain('data-warning-reference="target"')
  expect(svg).toContain('data-warning-reference="leader"')
  expect(svg).toContain(warningMessage.replaceAll('"', "&quot;"))
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "custom-symbol-missing-refdes-warning",
  )
})
