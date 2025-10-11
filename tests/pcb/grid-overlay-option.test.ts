import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

type CircuitElement = any

const circuit: CircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board_0",
    center: { x: 0, y: 0 },
    width: 30,
    height: 30,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_0",
    route: [
      { x: -10, y: -10 },
      { x: 0, y: 5 },
      { x: 10, y: -5 },
    ],
    width: 0.4,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_0",
    shape: "rect",
    x: -5,
    y: 5,
    width: 2,
    height: 4,
    layer: "top",
  },
  {
    type: "pcb_via",
    pcb_via_id: "via_0",
    x: 6,
    y: 6,
    hole_diameter: 0.6,
    outer_diameter: 1.2,
  },
]

test("grid overlay option", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    grid: {
      cellSize: 20,
    },
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("grid overlay custom line color", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    grid: {
      cellSize: 16,
      lineColor: "rgba(255, 0, 0, 0.4)",
    },
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path, "custom-color")
})

test("grid overlay with major lines", () => {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    grid: {
      cellSize: 5,
      lineColor: "rgba(255, 255, 255, 0.3)",
      majorCellSize: 20,
      majorLineColor: "rgba(0, 255, 0, 0.5)",
    },
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path, "major-lines")
})

test("grid overlay errors when major cell size is not a multiple", () => {
  expect(() =>
    convertCircuitJsonToPcbSvg(circuit, {
      grid: {
        cellSize: 5,
        majorCellSize: 12,
      },
    }),
  ).toThrow("grid.majorCellSize must be a positive multiple of grid.cellSize")
})
