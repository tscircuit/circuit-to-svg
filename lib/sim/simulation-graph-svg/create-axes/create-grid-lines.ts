import type { SvgObject } from "lib/svg-object"
import {
  type AxisInfo,
  MARGIN,
  type ScaleFn,
  formatNumber,
  svgElement,
} from "../simulation-graph-svg-shared"

interface GridLinesOptions {
  timeAxis: AxisInfo
  valueAxis: AxisInfo
  scaleX: ScaleFn
  scaleY: ScaleFn
  plotLeft: number
  plotWidth: number
  plotHeight: number
}

export function createGridLines({
  timeAxis,
  valueAxis,
  scaleX,
  scaleY,
  plotLeft,
  plotWidth,
  plotHeight,
}: GridLinesOptions): SvgObject {
  const top = MARGIN.top
  const bottom = MARGIN.top + plotHeight
  const left = plotLeft
  const right = plotLeft + plotWidth

  const children: SvgObject[] = []

  for (const tick of timeAxis.ticks) {
    const x = formatNumber(scaleX(tick))
    children.push(
      svgElement("line", {
        class: "grid-line grid-line-x",
        x1: x,
        y1: formatNumber(top),
        x2: x,
        y2: formatNumber(bottom),
      }),
    )
  }

  for (const tick of valueAxis.ticks) {
    const y = formatNumber(scaleY(tick))
    children.push(
      svgElement("line", {
        class: "grid-line grid-line-y",
        x1: formatNumber(left),
        y1: y,
        x2: formatNumber(right),
        y2: y,
      }),
    )
  }

  return svgElement("g", { class: "grid" }, children)
}
