import type { SvgObject } from "lib/svg-object"
import { formatValueWithUnit } from "../format-value-with-unit"
import {
  type AxisInfo,
  MARGIN,
  type PreparedSimulationGraph,
  SCOPE_AXIS_SPACING,
  type ScaleFn,
  formatNumber,
  isCurrentGraph,
  isUsableScopeTraceDisplay,
  svgElement,
  textNode,
} from "../simulation-graph-svg-shared"

interface ScopeValueAxesOptions {
  graphs: PreparedSimulationGraph[]
  valueAxis: AxisInfo
  scaleY: ScaleFn
  plotLeft: number
  plotWidth: number
  plotHeight: number
}

export function createScopeValueAxes({
  graphs,
  valueAxis,
  scaleY,
  plotLeft,
  plotWidth,
  plotHeight,
}: ScopeValueAxesOptions): SvgObject[] {
  const top = MARGIN.top
  const bottom = MARGIN.top + plotHeight
  const left = plotLeft
  const right = plotLeft + plotWidth
  const axisElements: SvgObject[] = []
  const scopeGraphs = graphs.filter((graph) =>
    isUsableScopeTraceDisplay(graph.scopeTraceDisplay),
  )

  for (const [axisIndex, entry] of scopeGraphs.entries()) {
    const side: "left" | "right" = axisIndex % 2 === 0 ? "left" : "right"
    const sideIndex = Math.floor(axisIndex / 2)
    const axisX =
      side === "left"
        ? left - 10 - sideIndex * SCOPE_AXIS_SPACING
        : right + 10 + sideIndex * SCOPE_AXIS_SPACING
    const textX = side === "left" ? axisX - 6 : axisX + 6
    const textAnchor = side === "left" ? "end" : "start"
    const tickEndX = side === "left" ? axisX + 6 : axisX - 6
    const traceDisplay = entry.scopeTraceDisplay
    if (!isUsableScopeTraceDisplay(traceDisplay)) continue

    axisElements.push(
      svgElement("line", {
        class: "axis axis-y axis-y-scope",
        x1: formatNumber(axisX),
        y1: formatNumber(top),
        x2: formatNumber(axisX),
        y2: formatNumber(bottom),
        style: `stroke: ${entry.color};`,
      }),
      svgElement(
        "text",
        {
          class: "axis-title axis-title-y axis-title-y-scope",
          x: formatNumber(axisX),
          y: formatNumber(top - 12),
          "text-anchor": "middle",
          style: `fill: ${entry.color}; font-size: 10px;`,
        },
        [textNode(entry.label)],
      ),
    )

    for (const tick of valueAxis.ticks) {
      const tickY = scaleY(tick)
      const rawValue =
        (traceDisplay.center ?? 0) +
        (tick - (traceDisplay.offsetDivs ?? 0)) * traceDisplay.valuePerDiv
      axisElements.push(
        svgElement("line", {
          class: "axis-tick axis-tick-y axis-tick-y-scope",
          x1: formatNumber(axisX),
          y1: formatNumber(tickY),
          x2: formatNumber(tickEndX),
          y2: formatNumber(tickY),
          style: `stroke: ${entry.color};`,
        }),
        svgElement(
          "text",
          {
            class: "axis-label axis-label-y axis-label-y-scope",
            x: formatNumber(textX),
            y: formatNumber(tickY),
            "text-anchor": textAnchor,
            "dominant-baseline": "middle",
            style: `fill: ${entry.color}; font-size: 10px;`,
          },
          [
            textNode(
              formatValueWithUnit(
                rawValue,
                isCurrentGraph(entry.graph) ? "A" : "V",
              ),
            ),
          ],
        ),
      )
    }
  }

  return axisElements
}
