import type { LayerRef } from "circuit-json"
import type { CopperLayerName } from "./colors"

export const COPPER_LAYER_ORDER: readonly CopperLayerName[] = [
  "top",
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "bottom",
] as const

const COPPER_LAYER_PRIORITY = new Map(
  COPPER_LAYER_ORDER.map((layer, index) => [layer, index] as const),
)

export function isCopperLayerName(layer: string): layer is CopperLayerName {
  return COPPER_LAYER_PRIORITY.has(layer as CopperLayerName)
}

export function getCopperLayerName(
  layer: LayerRef | string | { name?: string } | null | undefined,
): CopperLayerName | undefined {
  if (!layer) return undefined

  if (typeof layer === "string") {
    return isCopperLayerName(layer) ? layer : undefined
  }

  if (typeof layer === "object") {
    const name = layer.name
    if (typeof name === "string" && isCopperLayerName(name)) {
      return name
    }
  }

  return undefined
}

export function compareCopperLayers(
  a: CopperLayerName,
  b: CopperLayerName,
): number {
  const priorityA = COPPER_LAYER_PRIORITY.get(a)
  const priorityB = COPPER_LAYER_PRIORITY.get(b)

  if (priorityA === undefined || priorityB === undefined) {
    return 0
  }

  return priorityB - priorityA
}
