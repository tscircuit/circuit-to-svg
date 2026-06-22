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

export function createLegend(
  graphs: PreparedSimulationGraph[],
  width: number,
): SvgObject {
  let currentY = MARGIN.top

  const children = graphs.map((entry) => {
    const x = width - MARGIN.right + 10
    const lines = wrapLegendText(entry.label)
    const legendItem = createLegendItem(entry, x, currentY, lines)
    const itemHeight = lines.length * LEGEND_LINE_HEIGHT

    currentY += Math.max(itemHeight, LEGEND_MIN_SPACING)

    return legendItem
  })

  return svgElement("g", { class: "legend" }, children)
}
