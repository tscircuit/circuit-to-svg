export type CopperLayerName =
  | "top"
  | "bottom"
  | "inner1"
  | "inner2"
  | "inner3"
  | "inner4"
  | "inner5"
  | "inner6"

export type CopperColorMap = Record<CopperLayerName, string> & {
  [layer: string]: string
}

export interface PcbColorMap {
  copper: CopperColorMap
  drill: string
  silkscreen: {
    top: string
    bottom: string
  }
  boardOutline: string
  soldermask: {
    top: string
    bottom: string
  }
  debugComponent: {
    fill: string | null
    stroke: string | null
  }
}

export interface PcbColorOverrides {
  copper?: Partial<PcbColorMap["copper"]>
  drill?: string
  silkscreen?: Partial<PcbColorMap["silkscreen"]>
  boardOutline?: string
  soldermask?: Partial<PcbColorMap["soldermask"]>
  debugComponent?: Partial<PcbColorMap["debugComponent"]>
}

export const DEFAULT_PCB_COLOR_MAP: PcbColorMap = {
  copper: {
    top: "rgb(200, 52, 52)", // f - top (red)
    bottom: "rgb(77, 127, 196)", // b - bottom (blue)
    inner1: "rgb(127, 200, 127)", // in1 - light green
    inner2: "rgb(206, 125, 44)", // in2 - orange
    inner3: "rgb(79, 203, 203)", // in3 - cyan
    inner4: "rgb(64, 224, 208)", // turquoise
    inner5: "rgb(138, 43, 226)", // blue violet
    inner6: "rgb(255, 105, 180)", // hot pink
  },
  soldermask: {
    top: "rgb(200, 52, 52)",
    bottom: "rgb(77, 127, 196)",
  },
  drill: "#ff00ff", // magenta
  silkscreen: {
    top: "#f2eda1",
    bottom: "#5da9e9",
  },
  boardOutline: "rgba(255, 255, 255, 0.5)",
  debugComponent: {
    fill: null,
    stroke: null,
  },
}

export const HOLE_COLOR = DEFAULT_PCB_COLOR_MAP.drill
export const SILKSCREEN_TOP_COLOR = DEFAULT_PCB_COLOR_MAP.silkscreen.top
export const SILKSCREEN_BOTTOM_COLOR = DEFAULT_PCB_COLOR_MAP.silkscreen.bottom // Blue color for bottom silkscreen
