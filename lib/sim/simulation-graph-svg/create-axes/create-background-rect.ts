import type { SvgObject } from "lib/svg-object"
import { formatNumber, svgElement } from "../simulation-graph-svg-shared"

export function createBackgroundRect(width: number, height: number): SvgObject {
  return svgElement("rect", {
    class: "background",
    x: "0",
    y: "0",
    width: formatNumber(width),
    height: formatNumber(height),
  })
}
