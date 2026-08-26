import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { parseSync } from "svgson"
import {
  findElement,
  getNestedSvg,
  schematicGraphic,
} from "./schematic-graphic-test-helpers"

test("a schematic graphic without an explicit sheet fills the output viewport", () => {
  const svg = convertCircuitJsonToSchematicSvg(
    [
      schematicGraphic({
        id: "schematic_graphic_standalone",
        svgContent:
          '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>',
      }),
    ],
    { width: 320, height: 180 },
  )

  const root = parseSync(svg)
  const graphic = findElement(root, "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const nestedSvg = getNestedSvg(graphic)

  expect(nestedSvg.attributes.x).toBe("0")
  expect(nestedSvg.attributes.y).toBe("0")
  expect(nestedSvg.attributes.width).toBe("320")
  expect(nestedSvg.attributes.height).toBe("180")
})
