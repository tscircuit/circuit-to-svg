import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getSchematicBoundsFromCircuitJson } from "lib/sch/get-schematic-bounds-from-circuit-json"

test("schematic_rect and schematic_text with omitted rotation or anchor do not emit NaN bounds or rotate(undefined)", () => {
  const circuitJson: any[] = [
    {
      type: "schematic_rect",
      schematic_rect_id: "sch_rect_no_rot",
      center: { x: 10, y: 5 },
      width: 4,
      height: 2,
      is_filled: true,
      is_dashed: false,
      subcircuit_id: "sub_1",
    },
    {
      type: "schematic_text",
      schematic_text_id: "sch_text_no_rot_anchor",
      position: { x: 10, y: 5 },
      text: "ANNOTATION_BOX",
      display_superscript: "1",
    },
  ]

  const bounds = getSchematicBoundsFromCircuitJson(circuitJson, 0.5)
  expect(Number.isFinite(bounds.minX)).toBe(true)
  expect(Number.isFinite(bounds.minY)).toBe(true)
  expect(Number.isFinite(bounds.maxX)).toBe(true)
  expect(Number.isFinite(bounds.maxY)).toBe(true)
  // Without the rotation fallback, schematic_rect with omitted rotation poisoned minX/maxX to NaN -> fallback [-1.5, 1.5]
  expect(bounds.minX).toBeLessThanOrEqual(7.5)
  expect(bounds.maxX).toBeGreaterThanOrEqual(12.5)

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)
  expect(svg).not.toContain("undefined")
  expect(svg).not.toContain("NaN")
  expect(svg).toContain('data-schematic-rect-id="sch_rect_no_rot"')
  expect(svg).toContain('data-schematic-text-id="sch_text_no_rot_anchor"')
  expect(svg).toContain('text-anchor="middle"')
  expect(svg).toContain('dominant-baseline="middle"')
})
