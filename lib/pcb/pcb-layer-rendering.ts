import type { LayerRef } from "circuit-json"
import type { SvgObject } from "../svg-object"

export type PcbSvgLayerName =
  | LayerRef
  | "global"
  | "board"
  | "soldermask-top"
  | "soldermask-bottom"
  | "through"
  | "drill"
  | "overlay"

export type PcbLayerOpacity = Partial<Record<PcbSvgLayerName, number>>

export function applyPcbLayerOpacity({
  objects,
  layerOpacity,
}: {
  objects: SvgObject[]
  layerOpacity?: PcbLayerOpacity
}): SvgObject[] {
  if (!layerOpacity) return objects
  const opacityByLayer = new Map(Object.entries(layerOpacity))

  return objects.map((object) => {
    const layer = object.attributes?.["data-pcb-layer"]
    const configuredOpacity = layer ? opacityByLayer.get(layer) : undefined
    if (configuredOpacity === undefined) return object
    if (
      !Number.isFinite(configuredOpacity) ||
      configuredOpacity < 0 ||
      configuredOpacity > 1
    ) {
      throw new RangeError(`Layer opacity must be between 0 and 1: ${layer}`)
    }

    const existingOpacity = Number(object.attributes?.opacity ?? 1)
    const combinedOpacity = Number.isFinite(existingOpacity)
      ? existingOpacity * configuredOpacity
      : configuredOpacity

    return {
      ...object,
      attributes: {
        ...object.attributes,
        opacity: String(combinedOpacity),
      },
    }
  })
}
