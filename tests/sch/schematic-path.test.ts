import { expect, test } from "bun:test"
import type { SchematicPath } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"

test("schematic path", () => {
  const circuitJson: SchematicPath[] = [
    {
      type: "schematic_path",
      schematic_component_id: "simple_chip_1",
      points: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 0, y: 1 },
      ],
      is_filled: false,
      stroke_width: 0.05,
    },
    {
      type: "schematic_path",
      schematic_component_id: "simple_chip_1",
      points: [
        { x: 3, y: 0 },
        { x: 4, y: 1.5 },
        { x: 5, y: 0 },
      ],
      is_filled: true,
      fill_color: "blue",
      stroke_width: 0.05,
    },
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})

test("schematic path with svg_path", () => {
  const circuitJson: SchematicPath[] = [
    {
      type: "schematic_path",
      schematic_component_id: "simple_chip_1",
      points: [],
      svg_path: "M 0 0 L 1 0 L 1 1 L 0 1 Z",
      is_filled: false,
      stroke_width: 0.05,
    },
    {
      type: "schematic_path",
      schematic_component_id: "simple_chip_1",
      points: [],
      svg_path: "M 2 0 Q 2.5 1 3 0",
      is_filled: false,
      stroke_width: 0.03,
    },
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path, "svg-path")
})

test("schematic path with stroke_color", () => {
  const circuitJson: SchematicPath[] = [
    {
      type: "schematic_path",
      schematic_component_id: "simple_chip_1",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      is_filled: false,
      stroke_width: 0.05,
      stroke_color: "red",
    },
    {
      type: "schematic_path",
      schematic_component_id: "simple_chip_1",
      points: [
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 1 },
        { x: 2, y: 1 },
      ],
      is_filled: true,
      fill_color: "blue",
      stroke_width: 0.05,
      stroke_color: "#00ff00",
    },
    {
      type: "schematic_path",
      schematic_component_id: "simple_chip_1",
      points: [],
      svg_path: "M 4 0 C 4.5 0.5 4.5 0.5 5 1",
      is_filled: false,
      stroke_width: 0.04,
      stroke_color: "purple",
    },
  ]

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path, "stroke-color")
})
