import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import {
  schematicGraphic,
  schematicSheet,
} from "./schematic-graphic-test-helpers"

const redPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAHUlEQVR4nGO4o6b2nxLMMGrA/9EwUBsNA7VhEQYASSEnH16qdtYAAAAASUVORK5CYII="

const nestedPngGraphic = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
    <image href="${redPngDataUrl}" x="100" y="50" width="400" height="200" preserveAspectRatio="none" />
  </svg>
`

test("renders a PNG nested inside a schematic SVG graphic", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicSheet("schematic_sheet_nested_png", 0),
      schematicGraphic({
        id: "schematic_graphic_nested_png",
        sheetId: "schematic_sheet_nested_png",
        svgContent: nestedPngGraphic,
      }),
    ],
    { width: 800, height: 500 },
  )

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
