import type { SchematicSheet } from "circuit-json"

export function getDefaultSchematicSheet(
  schematicSheets: SchematicSheet[],
): SchematicSheet | undefined {
  return schematicSheets.reduce<SchematicSheet | undefined>(
    (bestSheet, sheet) => {
      if (!bestSheet) return sheet
      if (sheet.sheet_index === undefined) return bestSheet
      if (bestSheet.sheet_index === undefined) return sheet
      return sheet.sheet_index < bestSheet.sheet_index ? sheet : bestSheet
    },
    undefined,
  )
}
