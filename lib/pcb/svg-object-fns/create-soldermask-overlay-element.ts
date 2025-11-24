import type { SvgObject } from "lib/svg-object"

/**
 * Creates a soldermask overlay element (pcb_soldermask) that covers copper.
 * This is used for covered copper features (pours, pads).
 */
export function createSoldermaskOverlayElement(
  elementType: "rect" | "polygon" | "path" | "circle",
  shapeAttributes: Record<string, string>,
  layer: string,
  fillColor: string,
  fillOpacity: string,
  className: string,
  additionalAttributes?: Record<string, string>,
): SvgObject {
  const baseAttributes: Record<string, string> = {
    class: className,
    fill: fillColor,
    "fill-opacity": fillOpacity,
    "data-type": "pcb_soldermask",
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
