/**
 * TODO use @tscircuit/pcb-colors when it's published
 */
export const LAYER_NAME_TO_COLOR = {
  top: "rgb(200, 52, 52)",
  bottom: "rgb(77, 127, 196)",
}

export function layerNameToColor(layerName: string) {
  return (
    LAYER_NAME_TO_COLOR[layerName as keyof typeof LAYER_NAME_TO_COLOR] ??
    "white"
  )
}
export const SOLDER_PASTE_LAYER_NAME_TO_COLOR = {
  bottom: "rgb(169, 169, 169)", // Lighter gray (Light gray)
  top: "rgb(105, 105, 105)", // Darker gray (Dim gray)
}

export function solderPasteLayerNameToColor(layerName: string) {
  return (
    SOLDER_PASTE_LAYER_NAME_TO_COLOR[
      layerName as keyof typeof SOLDER_PASTE_LAYER_NAME_TO_COLOR
    ] ?? "gray" // Gray color for solder paste
  )
}
