import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { parseSync } from "svgson"
import {
  findElement,
  findElementWithName,
  getGraphicNamespace,
  getNestedSvg,
  schematicGraphic,
  schematicSheet,
  systemBlockDiagramSvg,
} from "./schematic-graphic-test-helpers"

test("renders a percent-encoded SVG asset inside a schematic sheet", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicSheet("schematic_sheet_system", 0),
      schematicGraphic({
        id: "schematic_graphic_system",
        sheetId: "schematic_sheet_system",
        svgContent: systemBlockDiagramSvg,
      }),
    ],
    { width: 1200, height: 848 },
  )

  const root = parseSync(svg)
  const graphic = findElement(root, "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const nestedSvg = getNestedSvg(graphic)

  expect(graphic.name).toBe("g")
  expect(graphic.attributes.class).toStartWith("schematic-graphic ")
  expect(graphic.attributes["data-circuit-json-type"]).toBe("schematic_graphic")
  expect(graphic.attributes["data-schematic-sheet-id"]).toBe(
    "schematic_sheet_system",
  )
  expect(nestedSvg.attributes.viewBox).toBe("0 0 800 400")
  expect(nestedSvg.attributes.preserveAspectRatio).toBe("xMidYMid meet")
  expect(Number(nestedSvg.attributes.x)).toBeGreaterThan(0)
  expect(Number(nestedSvg.attributes.y)).toBeGreaterThan(0)
  expect(Number(nestedSvg.attributes.width)).toBeLessThan(1200)
  expect(Number(nestedSvg.attributes.height)).toBeLessThan(848)

  const gradient = findElementWithName(nestedSvg, "linearGradient")
  expect(gradient?.attributes.id).toStartWith(
    `${getGraphicNamespace(graphic)}--`,
  )
  expect(svg).toContain(`fill="url(#${gradient?.attributes.id})"`)
  expect(svg).toContain(">System Block Diagram</text>")
  expect(svg).not.toContain("data:image/svg+xml")
  expect(svg.indexOf('data-schematic-graphic-id="')).toBeLessThan(
    svg.indexOf('class="schematic-sheet"'),
  )
  expect(svg).toMatchSvgSnapshot(import.meta.path, "schematic-graphic")
})
