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
    top: "rgb(200, 52, 52)",
    inner1: "rgb(255, 140, 0)",
    inner2: "rgb(255, 215, 0)",
    inner3: "rgb(50, 205, 50)",
    inner4: "rgb(64, 224, 208)",
    inner5: "rgb(138, 43, 226)",
    inner6: "rgb(255, 105, 180)",
    bottom: "rgb(77, 127, 196)",
  },
  soldermask: {
    top: "rgb(18, 82, 50)",
    bottom: "rgb(77, 127, 196)",
  },
  drill: "#FF26E2",
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
