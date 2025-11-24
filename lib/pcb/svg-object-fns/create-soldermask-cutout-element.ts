import type { SvgObject } from "lib/svg-object"
import type { PcbColorMap } from "../colors"

/**
 * Creates a soldermask cutout element (pcb_soldermask_opening) that punches through the base mask.
 * This is used for uncovered copper features (pours, pads, holes).
 */
export function createSoldermaskCutoutElement(
  elementType: "rect" | "polygon" | "path" | "circle",
  shapeAttributes: Record<string, string>,
  layer: string,
  colorMap: PcbColorMap,
  additionalAttributes?: Record<string, string>,
): SvgObject {
  const baseAttributes: Record<string, string> = {
    class: "pcb-soldermask-cutout",
    fill: colorMap.substrate,
    "data-type": "pcb_soldermask_opening",
    "data-pcb-layer": layer,
    ...shapeAttributes,
    ...additionalAttributes,
  }

  return {
    name: elementType,
    type: "element",
    value: "",
    children: [],
    attributes: baseAttributes,
  }
}
