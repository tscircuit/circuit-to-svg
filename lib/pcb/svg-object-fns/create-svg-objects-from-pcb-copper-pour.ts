import type { PcbCopperPour } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { layerNameToColor } from "../layer-name-to-color"
import type { PcbContext } from "../convert-circuit-json-to-pcb-svg"
import { createSoldermaskCutoutElement } from "./create-soldermask-cutout-element"
import { createSoldermaskOverlayElement } from "./create-soldermask-overlay-element"
import { getCopperPourShape } from "./get-copper-pour-shape"

export function createSvgObjectsFromPcbCopperPour(
  pour: PcbCopperPour,
  ctx: PcbContext,
): SvgObject[] {
  const { transform, layer: layerFilter, colorMap, showSolderMask } = ctx
  const { layer } = pour

  if (layerFilter && layer !== layerFilter) return []

  const shape = getCopperPourShape(pour, transform)
  if (!shape) return []
  const { elementType, shapeAttributes } = shape

  const color = layerNameToColor(layer, colorMap)
  const opacity = "0.5"
  const isCoveredWithSolderMask = pour.covered_with_solder_mask !== false

  const maskOverlayColor =
    layer === "bottom"
      ? colorMap.soldermaskOverCopper.bottom
      : colorMap.soldermaskOverCopper.top
  const maskOverlayOpacity = "0.9"

  const copperObject: SvgObject = {
    name: elementType,
    type: "element",
    value: "",
    children: [],
    attributes: {
      class: `pcb-copper-pour pcb-copper-pour-${pour.shape}`,
      ...shapeAttributes,
      fill: color,
      "fill-opacity": opacity,
      "data-type": "pcb_copper_pour",
      "data-pcb-layer": layer,
    },
  }

  const soldermaskObject: SvgObject | null = showSolderMask
    ? isCoveredWithSolderMask
      ? createSoldermaskOverlayElement({
          elementType,
          shapeAttributes,
          layer,
          fillColor: maskOverlayColor,
          fillOpacity: maskOverlayOpacity,
          className: "pcb-soldermask-covered-pour",
        })
      : createSoldermaskCutoutElement({
          elementType,
          shapeAttributes,
          layer,
          colorMap,
        })
    : null

  if (!soldermaskObject) {
    return [copperObject]
  }

  // For uncovered pours, check if this is a "substrate-only" case (no copper visible)
  // This is indicated by the pour ID containing "substrate_only"
  const isSubstrateOnly =
    !isCoveredWithSolderMask &&
    pour.pcb_copper_pour_id?.includes("substrate_only")

  if (isSubstrateOnly) {
    return [soldermaskObject] // Only return the substrate cutout, no copper
  }

  return [copperObject, soldermaskObject]
}
