import { test, expect } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"
import { parseSync, type INode } from "svgson"

const anchors = [
  "top_left",
  "top_center",
  "top_right",
  "center_left",
  "center",
  "center_right",
  "bottom_left",
  "bottom_center",
  "bottom_right",
] as const

const makeTableCircuit = (
  positions: Record<(typeof anchors)[number], { x: number; y: number }>,
): AnyCircuitElement[] => {
  const circuitJson: AnyCircuitElement[] = []
  for (const anchor of anchors) {
    const tableId = `table_${anchor}`
    circuitJson.push({
      type: "schematic_table",
      schematic_table_id: tableId,
      anchor_position: positions[anchor],
      anchor,
      column_widths: [4],
      row_heights: [2],
    } as any)
    circuitJson.push({
      type: "schematic_table_cell",
      schematic_table_cell_id: `cell_${anchor}`,
      schematic_table_id: tableId,
      start_row_index: 0,
      end_row_index: 0,
      start_column_index: 0,
      end_column_index: 0,
      text: anchor,
    } as any)
  }
  return circuitJson
}

const getBorderRects = (svg: string) => {
  const rects: Record<string, { x: number; y: number }> = {}
  const visit = (node: INode) => {
    if (
      node.name === "g" &&
      node.attributes.class === "sch-table" &&
      node.attributes["data-schematic-table-id"]
    ) {
      const border = node.children.find(
        (child) => child.attributes?.class === "sch-table-border",
      )
      if (border) {
        rects[node.attributes["data-schematic-table-id"]] = {
          x: Number(border.attributes.x),
          y: Number(border.attributes.y),
        }
      }
    }
    for (const child of node.children) visit(child)
  }
  visit(parseSync(svg))
  return rects
}

test("each of the nine-point anchors places the table border at a distinct position", () => {
  const origin = { x: 0, y: 0 }
  const positions = Object.fromEntries(
    anchors.map((anchor) => [anchor, origin]),
  ) as Record<(typeof anchors)[number], { x: number; y: number }>

  const svg = convertCircuitJsonToSchematicSvg(makeTableCircuit(positions))
  const rects = getBorderRects(svg)

  for (const anchor of anchors) {
    expect(rects[`table_${anchor}`]).toBeDefined()
  }

  // top_center keeps the top edge on the anchor, only centering horizontally
  expect(rects.table_top_center!.x).toBeCloseTo(rects.table_center!.x, 5)
  expect(rects.table_top_center!.y).toBeCloseTo(rects.table_top_left!.y, 5)

  // center_left keeps the left edge on the anchor, only centering vertically
  expect(rects.table_center_left!.x).toBeCloseTo(rects.table_top_left!.x, 5)
  expect(rects.table_center_left!.y).toBeCloseTo(rects.table_center!.y, 5)

  // center_right keeps the right edge on the anchor, only centering vertically
  expect(rects.table_center_right!.x).toBeCloseTo(rects.table_top_right!.x, 5)
  expect(rects.table_center_right!.y).toBeCloseTo(rects.table_center!.y, 5)

  // bottom_center keeps the bottom edge on the anchor, only centering horizontally
  expect(rects.table_bottom_center!.x).toBeCloseTo(rects.table_center!.x, 5)
  expect(rects.table_bottom_center!.y).toBeCloseTo(
    rects.table_bottom_left!.y,
    5,
  )
})

test("schematic table nine point anchors", () => {
  const positions = {} as Record<
    (typeof anchors)[number],
    { x: number; y: number }
  >
  anchors.forEach((anchor, i) => {
    positions[anchor] = { x: (i % 3) * 8, y: 12 - Math.floor(i / 3) * 6 }
  })

  expect(
    convertCircuitJsonToSchematicSvg(makeTableCircuit(positions), {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
