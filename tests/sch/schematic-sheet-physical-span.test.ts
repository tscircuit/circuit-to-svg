import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("a legacy 1.1-unit line spans 10.16 mm on the rendered sheet", () => {
  const circuit: CircuitJson = [
    {
      type: "schematic_sheet",
      schematic_sheet_id: "sheet",
      name: "Calibration",
      sheet_width: 40.64,
      sheet_height: 25.4,
    },
    {
      type: "schematic_line",
      schematic_line_id: "span",
      schematic_sheet_id: "sheet",
      x1: -0.55,
      y1: 0,
      x2: 0.55,
      y2: 0,
      stroke_width: 0.06,
      color: "#840000",
      is_dashed: false,
    },
  ]
  const svg = convertCircuitJsonToSchematicSvg(circuit, {
    width: 640,
    height: 400,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
