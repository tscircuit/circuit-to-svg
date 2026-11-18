import type { CircuitJson } from "circuit-json"
import { stringifySvg } from "lib/utils/stringify-svg"
import { colorMap } from "lib/utils/colors"
import { getSimulationEyeDiagram } from "./get-simulation-eye-diagram"
import { CIRCUIT_TO_SVG_VERSION } from "lib/package-version"
import { getSoftwareUsedString } from "lib/utils/get-software-used-string"
import { buildAxisInfo } from "./simulation-graph-svg/create-axes/build-axis-info"
import { createAxes } from "./simulation-graph-svg/create-axes"
import { createBackgroundRect } from "./simulation-graph-svg/create-axes/create-background-rect"
import { createDefsNode } from "./simulation-graph-svg/create-axes/create-defs-node"
import { createGridLines } from "./simulation-graph-svg/create-axes/create-grid-lines"
import { createLinearScale } from "./simulation-graph-svg/create-axes/create-linear-scale"
import { createPlotBackground } from "./simulation-graph-svg/create-axes/create-plot-background"
import { createStyleNode } from "./simulation-graph-svg/create-axes/create-style-node"
import {
  getTimeAxisDisplay,
  type SimulationTimeUnit,
} from "./simulation-graph-svg/get-time-axis-display"
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  MARGIN,
  FALLBACK_LINE_COLOR,
  createClipPathId,
  formatNumber,
  svgElement,
  textNode,
} from "./simulation-graph-svg/simulation-graph-svg-shared"

export function convertCircuitJsonToSimulationEyeDiagramSvg({
  circuitJson,
  simulation_eye_diagram_id,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  time_unit = "auto",
  includeVersion,
}: {
  circuitJson: CircuitJson
  simulation_eye_diagram_id: string
  width?: number
  height?: number
  time_unit?: SimulationTimeUnit | "auto"
  includeVersion?: boolean
}): string {
  const { eye, graph, windows } = getSimulationEyeDiagram({
    circuitJson,
    simulation_eye_diagram_id,
  })
  const { timeAxis, xAxisTitle } = getTimeAxisDisplay({
    timeAxis: {
      domainMin: 0,
      domainMax: 2 * eye.unit_interval_ms,
      ticks: [0, 0.5, 1, 1.5, 2].map((offset) => offset * eye.unit_interval_ms),
    },
    timeUnit: time_unit,
  })
  const valueAxis = buildAxisInfo(
    windows.flatMap((window) => window.map((point) => point.voltage)),
    true,
  )
  const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right)
  const plotHeight = Math.max(1, height - MARGIN.top - MARGIN.bottom)
  const plotLeft = MARGIN.left
  const scaleX = createLinearScale(
    0,
    2 * eye.unit_interval_ms,
    plotLeft,
    plotLeft + plotWidth,
  )
  const scaleY = createLinearScale(
    valueAxis.domainMin,
    valueAxis.domainMax,
    MARGIN.top + plotHeight,
    MARGIN.top,
  )
  const clipPathId = createClipPathId(simulation_eye_diagram_id)
  const softwareUsedString = getSoftwareUsedString(circuitJson)
  return stringifySvg(
    svgElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: width.toString(),
        height: height.toString(),
        viewBox: `0 0 ${width} ${height}`,
        style: `background-color: ${colorMap.schematic.background}`,
        "data-simulation-eye-diagram-id": simulation_eye_diagram_id,
        "data-eye-window-count": windows.length.toString(),
        "data-simulation-experiment-id": eye.simulation_experiment_id,
        ...(softwareUsedString && {
          "data-software-used-string": softwareUsedString,
        }),
        ...(includeVersion && {
          "data-circuit-to-svg-version": CIRCUIT_TO_SVG_VERSION,
        }),
      },
      [
        createStyleNode(),
        createBackgroundRect(width, height),
        createDefsNode(clipPathId, plotLeft, plotWidth, plotHeight),
        createPlotBackground(plotLeft, plotWidth, plotHeight),
        createGridLines({
          timeAxis,
          valueAxis,
          scaleX,
          scaleY,
          plotLeft,
          plotWidth,
          plotHeight,
        }),
        svgElement(
          "g",
          { "clip-path": `url(#${clipPathId})` },
          windows.map((window, index) =>
            svgElement("path", {
              "data-eye-window-index": index.toString(),
              d: window
                .map(
                  (point, pointIndex) =>
                    `${pointIndex === 0 ? "M" : "L"} ${formatNumber(scaleX(point.timeMs))} ${formatNumber(scaleY(point.voltage))}`,
                )
                .join(" "),
              fill: "none",
              stroke: graph.color ?? FALLBACK_LINE_COLOR,
              "stroke-width": "1",
              "stroke-opacity": "0.45",
            }),
          ),
        ),
        createAxes({
          timeAxis,
          valueAxis,
          graphs: [],
          scaleX,
          scaleY,
          plotLeft,
          plotWidth,
          plotHeight,
          yAxisTitle: "Voltage (V)",
          xAxisTitle: `Folded ${xAxisTitle.toLowerCase()}`,
          usesScopeTraceDisplay: false,
        }),
        svgElement(
          "text",
          {
            class: "chart-title",
            x: formatNumber(width / 2),
            y: "24",
            "text-anchor": "middle",
          },
          [textNode(`${eye.name} — Eye diagram`)],
        ),
        svgElement(
          "text",
          {
            class: "legend-label",
            x: formatNumber(width / 2),
            y: "44",
            "text-anchor": "middle",
          },
          [
            textNode(
              `${windows.length} complete windows · 2 UI · Stimulus clock alignment`,
            ),
          ],
        ),
      ],
    ),
  )
}
