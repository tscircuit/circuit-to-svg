import type { SvgObject } from "lib/svg-object"
import {
  LEGEND_LINE_HEIGHT,
  createLegendItem,
} from "./create-legend/create-legend-item"
import { wrapLegendText } from "./create-legend/wrap-legend-text"
import {
  MARGIN,
  type PreparedSimulationGraph,
  svgElement,
} from "./simulation-graph-svg-shared"

const LEGEND_MIN_SPACING = 24

const getLegendItemHeight = (lines: string[]) =>
  Math.max(lines.length * LEGEND_LINE_HEIGHT, LEGEND_MIN_SPACING)

export function getLegendHeight(graphs: PreparedSimulationGraph[]): number {
  return graphs.reduce(
    (height, entry) =>
      height + getLegendItemHeight(wrapLegendText(entry.label)),
    0,
  )
}

export function createLegend(
  graphs: PreparedSimulationGraph[],
  width: number,
): SvgObject {
  let currentY = MARGIN.top

  const children = graphs.map((entry) => {
    const x = width - MARGIN.right + 10
    const lines = wrapLegendText(entry.label)
    const legendItem = createLegendItem(entry, x, currentY, lines)
    currentY += getLegendItemHeight(lines)

    return legendItem
  })

  return svgElement("g", { class: "legend" }, children)
}
