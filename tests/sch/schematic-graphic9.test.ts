import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { schematicGraphic } from "./schematic-graphic-test-helpers"

test("schematic graphics render behind debug objects", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    schematicGraphic({
      id: "schematic_graphic_layering",
      svgContent:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="white"/></svg>',
    }),
    {
      type: "schematic_debug_object",
      shape: "rect",
      center: { x: 0, y: 0 },
      size: { width: 1, height: 1 },
      label: "DEBUG ABOVE GRAPHIC",
    } as AnyCircuitElement,
  ])

  expect(svg.indexOf('data-schematic-graphic-id="')).toBeLessThan(
    svg.indexOf("DEBUG ABOVE GRAPHIC"),
  )
})
