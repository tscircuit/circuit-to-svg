import type { SvgObject } from "lib/svg-object"
import {
  MARGIN,
  formatNumber,
  svgElement,
} from "../simulation-graph-svg-shared"

export function createDefsNode(
  clipPathId: string,
  plotLeft: number,
  plotWidth: number,
  plotHeight: number,
): SvgObject {
  return svgElement("defs", {}, [
    svgElement("clipPath", { id: clipPathId }, [
      svgElement("rect", {
        x: formatNumber(plotLeft),
        y: formatNumber(MARGIN.top),
        width: formatNumber(plotWidth),
        height: formatNumber(plotHeight),
      }),
    ]),
  ])
}
