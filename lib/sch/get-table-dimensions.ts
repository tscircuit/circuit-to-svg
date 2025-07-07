import type {
  AnyCircuitElement,
  SchematicTable,
  SchematicTableCell,
} from "circuit-json"
import { getSchMmFontSize } from "lib/utils/get-sch-font-size"
import { estimateTextWidth } from "./estimate-text-width"

export const getTableDimensions = (
  schematicTable: SchematicTable,
  circuitJson: AnyCircuitElement[],
) => {
  if (
    schematicTable.column_widths &&
    schematicTable.column_widths.length > 0 &&
    schematicTable.row_heights &&
    schematicTable.row_heights.length > 0
  ) {
    const unitToMm = (v: number | string) => {
      if (typeof v === "number") return v
      if (v.endsWith("mm")) return parseFloat(v)
      if (v.endsWith("in")) return parseFloat(v) * 25.4
      return parseFloat(v)
    }
    return {
      column_widths: schematicTable.column_widths.map(unitToMm),
      row_heights: schematicTable.row_heights.map(unitToMm),
    }
  }
  const cells = circuitJson.filter(
    (elm): elm is SchematicTableCell =>
      elm.type === "schematic_table_cell" &&
      elm.schematic_table_id === schematicTable.schematic_table_id,
  )

  if (cells.length === 0) {
    return { column_widths: [], row_heights: [] }
  }

  const numColumns =
    cells.reduce((max, c) => Math.max(max, c.end_column_index), -1) + 1
  const numRows =
    cells.reduce((max, c) => Math.max(max, c.end_row_index), -1) + 1

  const { cell_padding = 0.2 } = schematicTable

  const column_widths = new Array(numColumns).fill(0)
  const row_heights = new Array(numRows).fill(0)

  // First pass: determine minimum size for each cell
  const cell_widths: { [key: string]: number } = {}
  const cell_heights: { [key: string]: number } = {}

  for (const cell of cells) {
    const fontSizeMm = getSchMmFontSize("reference_designator", cell.font_size)
    const textWidthMm = estimateTextWidth(cell.text ?? "") * fontSizeMm
    const requiredWidth = textWidthMm + 2 * cell_padding
    const requiredHeight = fontSizeMm * 1.2 + 2 * cell_padding

    const key = `${cell.start_row_index}-${cell.start_column_index}`
    cell_widths[key] = requiredWidth
    cell_heights[key] = requiredHeight
  }

  // Second pass: set column and row sizes based on the max required
  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numColumns; j++) {
      const key = `${i}-${j}`
      if (cell_widths[key] && cell_widths[key]! > column_widths[j]!) {
        column_widths[j] = cell_widths[key]!
      }
      if (cell_heights[key] && cell_heights[key]! > row_heights[i]!) {
        row_heights[i] = cell_heights[key]!
      }
    }
  }

  // Third pass: adjust for merged cells
  for (const cell of cells) {
    if (
      cell.start_column_index === cell.end_column_index &&
      cell.start_row_index === cell.end_row_index
    )
      continue

    const key = `${cell.start_row_index}-${cell.start_column_index}`
    const requiredWidth = cell_widths[key]
    const requiredHeight = cell_heights[key]

    if (requiredWidth === undefined || requiredHeight === undefined) continue

    let currentWidth = 0
    for (let i = cell.start_column_index; i <= cell.end_column_index; i++) {
      currentWidth += column_widths[i]!
    }

    if (requiredWidth > currentWidth) {
      const diff = requiredWidth - currentWidth
      const extraPerColumn =
        diff / (cell.end_column_index - cell.start_column_index + 1)
      for (let i = cell.start_column_index; i <= cell.end_column_index; i++) {
        column_widths[i] += extraPerColumn
      }
    }

    let currentHeight = 0
    for (let i = cell.start_row_index; i <= cell.end_row_index; i++) {
      currentHeight += row_heights[i]!
    }

    if (requiredHeight > currentHeight) {
      const diff = requiredHeight - currentHeight
      const extraPerRow = diff / (cell.end_row_index - cell.start_row_index + 1)
      for (let i = cell.start_row_index; i <= cell.end_row_index; i++) {
        row_heights[i] += extraPerRow
      }
    }
  }

  return { column_widths, row_heights }
}
