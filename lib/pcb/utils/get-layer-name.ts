export function getLayerName(layer: unknown): string {
  if (!layer) return "overlay"

  if (typeof layer === "string") {
    return layer
  }

  if (typeof layer === "object") {
    const layerRef = layer as {
      layer_id?: unknown
      layer?: unknown
      side?: unknown
      name?: unknown
    }

    if (typeof layerRef.layer_id === "string") {
      return layerRef.layer_id
    }

    if (typeof layerRef.layer === "string") {
      return layerRef.layer
    }

    if (typeof layerRef.side === "string") {
      return layerRef.side
    }

    if (typeof layerRef.name === "string") {
      return layerRef.name
    }
  }

  return "overlay"
}
