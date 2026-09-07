import type { SchematicComponent } from "circuit-json"

export function getFiniteSchematicComponentSize(
  size: SchematicComponent["size"],
): SchematicComponent["size"] {
  return {
    width: Number.isFinite(size.width) ? size.width : 0,
    height: Number.isFinite(size.height) ? size.height : 0,
  }
}
