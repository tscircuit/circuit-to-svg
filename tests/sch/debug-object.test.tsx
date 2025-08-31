import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"

test("schematic debug objects", () => {
  expect(
    convertCircuitJsonToSchematicSvg(
      [
        {
          type: "schematic_debug_object",
          shape: "rect",
          center: { x: 0, y: 0 },
          size: { width: 2, height: 1 },
          label: "Debug Box",
        },
        {
          type: "schematic_debug_object",
          shape: "line",
          start: { x: -1, y: 1 },
          end: { x: 1, y: 2 },
          label: "Debug Line",
        },
      ],
      {
        grid: {
          cellSize: 1,
          labelCells: true,
        },
      },
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
