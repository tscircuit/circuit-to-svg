import type { SvgObject } from "lib/svg-object"
import {
  MARGIN,
  formatNumber,
  svgElement,
} from "../simulation-graph-svg-shared"

export function createPlotBackground(
  plotLeft: number,
  plotWidth: number,
  plotHeight: number,
): SvgObject {
  return svgElement("rect", {
    class: "plot-background",
    x: formatNumber(plotLeft),
    y: formatNumber(MARGIN.top),
    width: formatNumber(plotWidth),
    height: formatNumber(plotHeight),
  })
}
