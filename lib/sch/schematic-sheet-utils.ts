import type { SchematicSheet } from "circuit-json"

// A4 dimensions in mm
export const DEFAULT_SCHEMATIC_SHEET_WIDTH = 297
export const DEFAULT_SCHEMATIC_SHEET_HEIGHT = 210

export const SCHEMATIC_SHEET_GAP = 20
export const SCHEMATIC_SHEET_INNER_MARGIN = 5

export interface SchematicSheetLayout {
  center: { x: number; y: number }
  width: number
  height: number
  minX: number
  maxX: number
  minY: number
  maxY: number
  innerMinX: number
  innerMaxX: number
  innerMinY: number
  innerMaxY: number
}

export function getSchematicSheetLayout(
  sheet: SchematicSheet,
): SchematicSheetLayout {
  const sheetIndex = sheet.sheet_index ?? 0
  const center = {
    x: sheetIndex * (DEFAULT_SCHEMATIC_SHEET_WIDTH + SCHEMATIC_SHEET_GAP),
    y: 0,
  }
  const minX = center.x - DEFAULT_SCHEMATIC_SHEET_WIDTH / 2
  const maxX = center.x + DEFAULT_SCHEMATIC_SHEET_WIDTH / 2
  const minY = center.y - DEFAULT_SCHEMATIC_SHEET_HEIGHT / 2
  const maxY = center.y + DEFAULT_SCHEMATIC_SHEET_HEIGHT / 2

  return {
    center,
    width: DEFAULT_SCHEMATIC_SHEET_WIDTH,
    height: DEFAULT_SCHEMATIC_SHEET_HEIGHT,
    minX,
    maxX,
    minY,
    maxY,
    innerMinX: minX + SCHEMATIC_SHEET_INNER_MARGIN,
    innerMaxX: maxX - SCHEMATIC_SHEET_INNER_MARGIN,
    innerMinY: minY + SCHEMATIC_SHEET_INNER_MARGIN,
    innerMaxY: maxY - SCHEMATIC_SHEET_INNER_MARGIN,
  }
}
