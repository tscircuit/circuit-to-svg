import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import referenceCircuit from "./assets/cc2340r5-reference/circuit.json"

test("CC2340R5 contents and exported interface follow schematic sheet selection", () => {
  const json: AnyCircuitElement[] = [
    {
      type: "schematic_sheet",
      schematic_sheet_id: "cover",
      sheet_index: 0,
      name: "Cover",
    },
    {
      type: "schematic_sheet",
      schematic_sheet_id: "radio",
      sheet_index: 1,
      name: "CC2340R5 reference",
      sheet_width: 330,
      sheet_height: 270,
    },
    ...(referenceCircuit as AnyCircuitElement[]).map((element) =>
      element.type.startsWith("schematic_")
        ? { ...element, schematic_sheet_id: "radio" }
        : element,
    ),
  ]
  const svg = convertCircuitJsonToSchematicSvg(json, {
    schematicSheetId: "radio",
    width: 1600,
    height: 1250,
  })
  expect(svg.match(/class="sch-group-boundary"/g)).toHaveLength(1)
  expect(svg.match(/class="sch-group-port-terminal"/g)).toHaveLength(13)
  expect(svg).toContain("CC2340R52E0RGER")
  const cover = convertCircuitJsonToSchematicSvg(json, {
    schematicSheetId: "cover",
  })
  expect(cover).not.toContain('class="sch-group-boundary"')
  expect(cover).not.toContain('class="sch-group-port-terminal"')
  expect(cover).not.toContain("CC2340R52E0RGER")
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
