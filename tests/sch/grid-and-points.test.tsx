import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("schematic with grid and labeled points", () => {
  expect(
    convertCircuitJsonToSchematicSvg(
      [
        {
          type: "schematic_debug_object",
          shape: "rect",
          center: { x: 0, y: 0 },
          size: { width: 2, height: 1 },
          label: "Test Box",
        }
      ],
      {
        grid: { cellSize: 0.5 },
        labeledPoints: [
          { x: 0, y: 0, label: "Origin" },
          { x: 1, y: 1, label: "Point A" }
        ]
      }
    )
  ).toMatchSvgSnapshot(import.meta.path)
})
