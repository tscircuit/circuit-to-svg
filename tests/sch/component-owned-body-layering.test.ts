import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("component body renders behind native symbol details", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "schematic_component",
      schematic_component_id: "schematic_component_1",
      center: { x: 0, y: 0 },
      size: { width: 2, height: 2 },
      is_box_with_pins: false,
    },
    {
      type: "schematic_line",
      schematic_line_id: "native_detail",
      schematic_component_id: "schematic_component_1",
      x1: -0.5,
      y1: 0,
      x2: 0.5,
      y2: 0,
      color: "#0000ff",
      is_dashed: false,
    },
    {
      type: "schematic_rect",
      schematic_rect_id: "native_body",
      schematic_component_id: "schematic_component_1",
      center: { x: 0, y: 0 },
      width: 2,
      height: 2,
      rotation: 0,
      color: "#0000ff",
      fill_color: "#ffffcc",
      is_filled: true,
      is_dashed: false,
    },
  ]

  const svg = convertCircuitJsonToSchematicSvg(circuitJson)

  expect(svg.indexOf('data-schematic-rect-id="native_body"')).toBeLessThan(
    svg.indexOf('data-schematic-line-id="native_detail"'),
  )
})
