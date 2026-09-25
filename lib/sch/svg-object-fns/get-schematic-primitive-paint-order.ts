import type { AnyCircuitElement } from "circuit-json"

export function getSchematicPrimitivePaintOrder(
  element: AnyCircuitElement,
): number {
  if (element.type === "schematic_rect") return 0
  if (
    (element.type === "schematic_circle" ||
      element.type === "schematic_path") &&
    element.is_filled
  ) {
    return 1
  }
  if (element.type === "schematic_text") return 3
  return 2
}
