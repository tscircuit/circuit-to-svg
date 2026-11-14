import { estimateTextWidth } from "lib/sch/estimate-text-width"
import {
  MARGIN,
  type PreparedSimulationGraph,
} from "../simulation-graph-svg-shared"
import { LEGEND_LINE_HEIGHT } from "./create-legend-item"
import { wrapLegendText } from "./wrap-legend-text"

export const LEGEND_MIN_SPACING = 24
const LEGEND_FONT_SIZE = 11
const LEGEND_PADDING = 16

/** Expand the canvas around the existing plot and legend anchors. */
export function getLegendBounds({
  graphs,
  width,
  height,
}: {
  graphs: PreparedSimulationGraph[]
  width: number
  height: number
}): { width: number; height: number } {
  let legendY = MARGIN.top
  let rightEdge = width
  let bottomEdge = height
  for (const graph of graphs) {
    const lines = wrapLegendText(graph.label)
    const textWidth =
      Math.max(...lines.map((line) => estimateTextWidth(line))) *
      LEGEND_FONT_SIZE
    // Arial metrics plus slack for the preferred Inter/Helvetica fallbacks.
    rightEdge = Math.max(
      rightEdge,
      width - MARGIN.right + 30 + textWidth * 1.2 + LEGEND_PADDING,
    )
    bottomEdge = Math.max(
      bottomEdge,
      legendY +
        (lines.length - 1) * LEGEND_LINE_HEIGHT +
        LEGEND_FONT_SIZE +
        LEGEND_PADDING,
    )
    legendY += Math.max(lines.length * LEGEND_LINE_HEIGHT, LEGEND_MIN_SPACING)
  }
  return { width: Math.ceil(rightEdge), height: Math.ceil(bottomEdge) }
}
