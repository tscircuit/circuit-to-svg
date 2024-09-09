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
