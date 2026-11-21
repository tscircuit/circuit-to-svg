import { MM_PER_SCHEMATIC_UNIT, type SchematicSheet } from "circuit-json"

export const DEFAULT_SCHEMATIC_SHEET_WIDTH = 297 / MM_PER_SCHEMATIC_UNIT
export const DEFAULT_SCHEMATIC_SHEET_HEIGHT = 210 / MM_PER_SCHEMATIC_UNIT

export const SCHEMATIC_SHEET_GAP = 20 / MM_PER_SCHEMATIC_UNIT
export const SCHEMATIC_SHEET_INNER_MARGIN = 5 / MM_PER_SCHEMATIC_UNIT

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

type SchematicSheetLayoutProperties = Pick<
  SchematicSheet,
  "sheet_width" | "sheet_height"
> & {
  center?: { x: number; y: number }
}

/**
 * Geometry of a schematic sheet's frame. The frame follows the sheet's explicit
 * center when present and otherwise defaults to the origin. It is not tiled by
 * sheet_index because each sheet is rendered independently.
 */
export function getSchematicSheetLayout(
  schematicSheet: SchematicSheetLayoutProperties = {},
): SchematicSheetLayout {
  const center = schematicSheet.center ?? { x: 0, y: 0 }
  const width =
    schematicSheet.sheet_width === undefined
      ? DEFAULT_SCHEMATIC_SHEET_WIDTH
      : schematicSheet.sheet_width / MM_PER_SCHEMATIC_UNIT
  const height =
    schematicSheet.sheet_height === undefined
      ? DEFAULT_SCHEMATIC_SHEET_HEIGHT
      : schematicSheet.sheet_height / MM_PER_SCHEMATIC_UNIT
  const minX = center.x - width / 2
  const maxX = center.x + width / 2
  const minY = center.y - height / 2
  const maxY = center.y + height / 2

  return {
    center,
    width,
    height,
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
