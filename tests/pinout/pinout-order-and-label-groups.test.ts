import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPinoutSvg } from "lib"
import { calculateLabelPositions } from "lib/pinout/calculate-label-positions"
import { identity } from "transformation-matrix"

test("convertCircuitJsonToPinoutSvg does not mutate caller soup array and orders unknown types after pinout objects", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_port",
      source_port_id: "source_port_1",
      name: "GPIO1",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      source_port_id: "source_port_1",
      pcb_component_id: "pcb_component_1",
      x: -4,
      y: 0,
      layers: ["top"],
      is_board_pinout: true,
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
  ]

  const originalOrder = soup.map((element) => element.type)
  const svg = convertCircuitJsonToPinoutSvg(soup)

  expect(soup.map((element) => element.type)).toEqual(originalOrder)
  expect(svg).toContain("GPIO1")
  const boardPathIndex = svg.indexOf('fill="rgb(26, 115, 143)"')
  const labelPolylineIndex = svg.indexOf("<polyline")
  expect(boardPathIndex).toBeGreaterThan(-1)
  expect(labelPolylineIndex).toBeGreaterThan(boardPathIndex)
})

test("convertCircuitJsonToPinoutSvg scales labels using plated hole outer dimensions on through-hole-only boards", () => {
  const makeThroughHoleBoard = (outerDiameter: number): AnyCircuitElement[] => [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_th",
      center: { x: 0, y: 0 },
      width: 12,
      height: 12,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "source_port",
      source_port_id: "sp_th_1",
      name: "D0",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp_th_1",
      source_port_id: "sp_th_1",
      pcb_component_id: "pc_th_1",
      x: -5,
      y: 0,
      layers: ["top", "bottom"],
      is_board_pinout: true,
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_th_1",
      shape: "circle",
      x: -5,
      y: 0,
      hole_diameter: outerDiameter * 0.5,
      outer_diameter: outerDiameter,
      layers: ["top", "bottom"],
      pcb_port_id: "pp_th_1",
    },
  ]

  const finePitchSvg = convertCircuitJsonToPinoutSvg(makeThroughHoleBoard(0.6))
  const standardPitchSvg = convertCircuitJsonToPinoutSvg(
    makeThroughHoleBoard(1.2),
  )

  const getPolylineStrokeWidth = (svg: string) =>
    Number(/<polyline[^>]*stroke-width="([0-9.]+)"/.exec(svg)?.[1])
  expect(getPolylineStrokeWidth(finePitchSvg)).toBeLessThan(
    getPolylineStrokeWidth(standardPitchSvg),
  )
})

test("calculateLabelPositions stacks reassigned top/bottom pins evenly when no vertical column has multiple pins", () => {
  const leftLabels = [
    {
      pcb_port: {
        type: "pcb_port" as const,
        pcb_port_id: "port_a",
        source_port_id: "sp_a",
        pcb_component_id: "c1",
        x: -4,
        y: 5,
        layers: ["top" as const],
      },
      aliases: ["A"],
      edge: "top" as const,
    },
    {
      pcb_port: {
        type: "pcb_port" as const,
        pcb_port_id: "port_b",
        source_port_id: "sp_b",
        pcb_component_id: "c1",
        x: -2,
        y: 5,
        layers: ["top" as const],
      },
      aliases: ["B"],
      edge: "top" as const,
    },
    {
      pcb_port: {
        type: "pcb_port" as const,
        pcb_port_id: "port_c",
        source_port_id: "sp_c",
        pcb_component_id: "c1",
        x: -1,
        y: 5,
        layers: ["top" as const],
      },
      aliases: ["C"],
      edge: "top" as const,
    },
  ]

  const positions = calculateLabelPositions({
    left_labels: leftLabels,
    right_labels: [],
    transform: identity(),
    soup: [],
    board_bounds: { minX: -5, minY: -5, maxX: 5, maxY: 5 },
    svgWidth: 800,
    svgHeight: 600,
    styleScale: 1,
  })

  const yA = positions.get("port_a")!.label_pos.y
  const yB = positions.get("port_b")!.label_pos.y
  const yC = positions.get("port_c")!.label_pos.y

  const gapAB = yB - yA
  const gapBC = yC - yB
  expect(gapAB).toBeGreaterThan(0)
  expect(Math.abs(gapAB - gapBC)).toBeLessThan(1e-6)
})
