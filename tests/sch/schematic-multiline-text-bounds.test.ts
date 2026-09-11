import { expect, test } from "bun:test"
import type { SchematicText } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { getSchematicBoundsFromCircuitJson } from "lib/sch/get-schematic-bounds-from-circuit-json"
import { parseSync } from "svgson"
import {
  applyToPoint,
  compose,
  fromDefinition,
  fromTransformAttribute,
} from "transformation-matrix"

const createText = (overrides: Partial<SchematicText> = {}): SchematicText => ({
  type: "schematic_text",
  schematic_text_id: "multiline_text",
  schematic_component_id: "",
  position: { x: 3, y: 4 },
  anchor: "center",
  rotation: 0,
  font_size: 1,
  color: "#000000",
  text: "A\nB\nC\nD\nE\nF\nG\nH",
  ...overrides,
})

test("multiline schematic bounds include the last line below the anchor", () => {
  const bounds = getSchematicBoundsFromCircuitJson([createText()], 0)
  expect(bounds.minY).toBeCloseTo(-3.5)
  expect(bounds.maxY).toBeCloseTo(4.5)
})

for (const anchor of ["top_left", "bottom_right", "center"] as const) {
  for (const rotation of [0, 90, -90, 180]) {
    test(`all multiline baselines fit in the SVG for ${anchor} at ${rotation} degrees`, () => {
      const root = parseSync(
        convertCircuitJsonToSchematicSvg([createText({ anchor, rotation })], {
          width: 1200,
          height: 600,
        }),
      )
      const text = root.children.find(
        (child) => child.attributes.class === "sch-text",
      )!
      expect(text.children).toHaveLength(8)
      const x = Number(text.attributes.x)
      const y = Number(text.attributes.y)
      const fontSize = Number.parseFloat(text.attributes["font-size"]!)
      const textToSvgTransform = compose(
        fromDefinition(fromTransformAttribute(text.attributes.transform!)),
      )
      for (let line = 0; line < 8; line++) {
        const baseline = applyToPoint(textToSvgTransform, {
          x,
          y: y + line * fontSize,
        })
        expect(baseline.x).toBeGreaterThan(0)
        expect(baseline.x).toBeLessThan(1200)
        expect(baseline.y).toBeGreaterThan(0)
        expect(baseline.y).toBeLessThan(600)
      }
    })
  }
}

test("multiline schematic bounds use the widest line rather than summed lengths", () => {
  const bounds = getSchematicBoundsFromCircuitJson(
    [createText({ text: "Wide label\nI\nI", anchor: "top_left" })],
    0,
  )
  expect(bounds.minX).toBeCloseTo(3)
  expect(bounds.maxX - bounds.minX).toBeCloseTo(10)
  expect(bounds.maxY).toBeCloseTo(4)
  expect(bounds.minY).toBeCloseTo(1)
})

test("multiline bounds preserve the conservative width estimate for CJK text", () => {
  const bounds = getSchematicBoundsFromCircuitJson(
    [createText({ text: `${"界".repeat(20)}\nI`, anchor: "top_left" })],
    0,
  )
  expect(bounds.minX).toBeCloseTo(3)
  expect(bounds.maxX).toBeCloseTo(23)
})

test("multiline schematic text fits the rendered image", () => {
  const svg = convertCircuitJsonToSchematicSvg([createText()], {
    width: 1200,
    height: 600,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
