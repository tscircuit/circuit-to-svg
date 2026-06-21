import type { SvgObject } from "lib/svg-object"
import {
  type PreparedSimulationGraph,
  formatNumber,
  svgElement,
  textNode,
} from "../simulation-graph-svg-shared"

export const LEGEND_LINE_HEIGHT = 16

export function createLegendItem(
  entry: PreparedSimulationGraph,
  x: number,
  y: number,
  lines: string[],
): SvgObject {
  const textChildren = lines.map((line, index) => {
    return svgElement(
      "tspan",
      {
        x: "20",
        dy: index === 0 ? "0" : String(LEGEND_LINE_HEIGHT),
      },
      [textNode(line)],
    )
  })

  return svgElement(
    "g",
    {
      class: "legend-item",
      transform: `translate(${formatNumber(x)} ${formatNumber(y)})`,
    },
    [
      svgElement("line", {
        class: "legend-line",
        x1: "0",
        y1: "0",
        x2: "16",
        y2: "0",
        stroke: entry.color,
      }),
      svgElement(
        "text",
        {
          class: "legend-label",
          x: "20",
          y: "0",
          "dominant-baseline": "middle",
        },
        textChildren,
      ),
    ],
  )
}
