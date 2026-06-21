import type { SvgObject } from "lib/svg-object"
import { formatDivs, formatValueWithUnit } from "../format-value-with-unit"
import {
  type PreparedSimulationGraph,
  SCOPE_LEGEND_GAP,
  formatNumber,
  getGraphId,
  getGraphIdDataAttributeName,
  isCurrentGraph,
  isUsableScopeTraceDisplay,
  svgElement,
  textNode,
} from "../simulation-graph-svg-shared"
import {
  SCOPE_LEGEND_CARD_GAP,
  SCOPE_LEGEND_CARD_HEIGHT,
  SCOPE_LEGEND_CARD_WIDTH,
  getScopeLegendGridLayout,
} from "./get-scope-legend-grid-layout"

const SCOPE_LEGEND_HEADER_HEIGHT = 20
const SCOPE_LEGEND_BODY_PADDING = 8
const SCOPE_LEGEND_BODY_FONT_SIZE = 14

export function createScopeLegend(
  graphs: PreparedSimulationGraph[],
  graphWidth: number,
  graphHeight: number,
): SvgObject {
  const layout = getScopeLegendGridLayout(graphs.length, graphWidth)
  const children: SvgObject[] = []

  for (const [index, entry] of graphs.entries()) {
    const column = index % layout.columns
    const row = Math.floor(index / layout.columns)
    children.push(
      createScopeLegendCard(
        entry,
        index,
        layout.x + column * (SCOPE_LEGEND_CARD_WIDTH + SCOPE_LEGEND_CARD_GAP),
        graphHeight +
          SCOPE_LEGEND_GAP +
          row * (SCOPE_LEGEND_CARD_HEIGHT + SCOPE_LEGEND_CARD_GAP),
      ),
    )
  }

  return svgElement("g", { class: "scope-legend" }, children)
}

function createScopeLegendCard(
  entry: PreparedSimulationGraph,
  index: number,
  x: number,
  y: number,
): SvgObject {
  const scopeTraceDisplay = entry.scopeTraceDisplay
  const unit = isCurrentGraph(entry.graph) ? "A" : "V"
  const unitsPerDiv =
    scopeTraceDisplay && isUsableScopeTraceDisplay(scopeTraceDisplay)
      ? formatValueWithUnit(scopeTraceDisplay.valuePerDiv, unit)
      : `1 ${unit}`
  const center = formatValueWithUnit(scopeTraceDisplay?.center ?? 0, unit)
  const offsetDivs = formatDivs(scopeTraceDisplay?.offsetDivs ?? 0)
  const channelName = `Ch${index + 1}`
  const label = entry.label === channelName ? undefined : entry.label

  const bodyLines = [label, `${unitsPerDiv}/div`, offsetDivs, center].filter(
    (line): line is string => Boolean(line),
  )
  const bodyLineSpacing =
    bodyLines.length > 1
      ? (SCOPE_LEGEND_CARD_HEIGHT -
          SCOPE_LEGEND_HEADER_HEIGHT -
          SCOPE_LEGEND_BODY_PADDING * 2 -
          SCOPE_LEGEND_BODY_FONT_SIZE) /
        (bodyLines.length - 1)
      : 0

  return svgElement(
    "g",
    {
      class: "scope-channel",
      transform: `translate(${formatNumber(x)} ${formatNumber(y)})`,
      [getGraphIdDataAttributeName(entry.graph)]: getGraphId(entry.graph),
    },
    [
      svgElement("rect", {
        class: "scope-channel-card",
        x: "0",
        y: "0",
        width: formatNumber(SCOPE_LEGEND_CARD_WIDTH),
        height: formatNumber(SCOPE_LEGEND_CARD_HEIGHT),
        rx: "6",
        ry: "6",
      }),
      svgElement("rect", {
        x: "0",
        y: "0",
        width: formatNumber(SCOPE_LEGEND_CARD_WIDTH),
        height: formatNumber(SCOPE_LEGEND_HEADER_HEIGHT),
        rx: "6",
        ry: "6",
        fill: entry.color,
      }),
      svgElement("rect", {
        x: "0",
        y: formatNumber(SCOPE_LEGEND_HEADER_HEIGHT - 6),
        width: formatNumber(SCOPE_LEGEND_CARD_WIDTH),
        height: "6",
        fill: entry.color,
      }),
      svgElement(
        "text",
        {
          class: "scope-channel-header-text",
          x: formatNumber(SCOPE_LEGEND_CARD_WIDTH / 2),
          y: "14",
          "text-anchor": "middle",
        },
        [textNode(channelName)],
      ),
      ...bodyLines.map((line, lineIndex) =>
        svgElement(
          "text",
          {
            class: "scope-channel-detail",
            x: formatNumber(SCOPE_LEGEND_BODY_PADDING),
            y: formatNumber(
              SCOPE_LEGEND_HEADER_HEIGHT +
                SCOPE_LEGEND_BODY_PADDING +
                lineIndex * bodyLineSpacing,
            ),
            "dominant-baseline": "hanging",
          },
          [textNode(line)],
        ),
      ),
    ],
  )
}
