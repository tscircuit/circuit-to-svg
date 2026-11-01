import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("schematic component with non-finite size renders without NaN coordinates", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    {
      type: "schematic_component",
      schematic_component_id: "sch_comp_1",
      source_component_id: "src_comp_1",
      center: { x: 0, y: 0 },
      is_box_with_pins: true,
      size: { width: Number.NaN, height: Number.POSITIVE_INFINITY },
    },
  ])

  expect(svg).not.toContain("NaN")
  expect(svg).toContain('data-schematic-component-id="sch_comp_1"')
})
