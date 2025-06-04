/**
 * TODO use @tscircuit/pcb-colors when it's published
 */
import type { PcbColorMap } from "./colors"
import { DEFAULT_PCB_COLOR_MAP } from "./colors"

export const LAYER_NAME_TO_COLOR = {
  top: DEFAULT_PCB_COLOR_MAP.copper.top,
  bottom: DEFAULT_PCB_COLOR_MAP.copper.bottom,
}

export function layerNameToColor(
  layerName: string,
  colorMap: PcbColorMap = DEFAULT_PCB_COLOR_MAP,
) {
  return colorMap.copper[layerName as keyof typeof colorMap.copper] ?? "white"
}

export const SOLDER_PASTE_LAYER_NAME_TO_COLOR = {
  bottom: "rgb(105, 105, 105)",
  top: "rgb(105, 105, 105)",
}

export function solderPasteLayerNameToColor(layerName: string) {
  return (
    SOLDER_PASTE_LAYER_NAME_TO_COLOR[
      layerName as keyof typeof SOLDER_PASTE_LAYER_NAME_TO_COLOR
    ] ?? "rgb(105, 105, 105)"
  )
}
