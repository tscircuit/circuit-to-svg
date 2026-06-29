const KICAD_RESISTOR_PIN_SPAN_MM = 10.16
const TSCIRCUIT_RESISTOR_PIN_SPAN = 1.1
export const SCHEMATIC_UNIT_TO_MM =
  KICAD_RESISTOR_PIN_SPAN_MM / TSCIRCUIT_RESISTOR_PIN_SPAN

export const DEFAULT_SCHEMATIC_SHEET_WIDTH = 297 / SCHEMATIC_UNIT_TO_MM
export const DEFAULT_SCHEMATIC_SHEET_HEIGHT = 210 / SCHEMATIC_UNIT_TO_MM

export const SCHEMATIC_SHEET_GAP = 20 / SCHEMATIC_UNIT_TO_MM
export const SCHEMATIC_SHEET_INNER_MARGIN = 5 / SCHEMATIC_UNIT_TO_MM

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

/**
 * Geometry of a schematic sheet's frame. Each sheet is laid out independently in
 * its own coordinate space (around the origin) and rendered one sheet per view
 * (single-sheet or stacked), so the frame is always centered at the origin - it
 * is not tiled by sheet_index.
 */
export function getSchematicSheetLayout(): SchematicSheetLayout {
  const center = { x: 0, y: 0 }
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
