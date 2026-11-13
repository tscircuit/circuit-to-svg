import { expect, test } from "bun:test"
import type { SchematicRect, SchematicText } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getSchematicBoundsFromCircuitJson } from "lib/sch/get-schematic-bounds-from-circuit-json"

test("rotated schematic_rect is not clipped by the viewport", () => {
  // A 20mm x 1mm rect rotated 90deg (rotation is in degrees) is 20mm tall
  const rect: SchematicRect = {
    type: "schematic_rect",
    schematic_rect_id: "schematic_rect_1",
    center: { x: 0, y: 0 },
    width: 20,
    height: 1,
    rotation: 90,
    stroke_width: 0.05,
    color: "#000000",
    is_filled: false,
    is_dashed: false,
  }

  const bounds = getSchematicBoundsFromCircuitJson([rect], 0)
  expect(bounds.minY).toBeCloseTo(-10)
  expect(bounds.maxY).toBeCloseTo(10)
  expect(bounds.minX).toBeCloseTo(-0.5)
  expect(bounds.maxX).toBeCloseTo(0.5)

  const svg = convertCircuitJsonToSchematicSvg([rect])
  const scale = Number(
    svg.match(/data-real-to-screen-transform="matrix\(([^,]*),/)![1],
  )
  // the rendered (rotated) rect must fit inside the 600px tall SVG
  expect(20 * scale).toBeLessThanOrEqual(600)
})

test("rotated schematic_text bounds swap width and height", () => {
  const text: SchematicText = {
    type: "schematic_text",
    schematic_text_id: "schematic_text_1",
    text: "A_LONG_SCHEMATIC_LABEL",
    position: { x: 0, y: 0 },
    rotation: 0,
    anchor: "center",
    font_size: 0.18,
    color: "#000000",
  }

  const horizontal = getSchematicBoundsFromCircuitJson([text], 0)
  const vertical = getSchematicBoundsFromCircuitJson(
    [{ ...text, rotation: 90 }],
    0,
  )

  expect(vertical.maxY - vertical.minY).toBeCloseTo(
    horizontal.maxX - horizontal.minX,
  )
  expect(vertical.maxX - vertical.minX).toBeCloseTo(
    horizontal.maxY - horizontal.minY,
  )
})
