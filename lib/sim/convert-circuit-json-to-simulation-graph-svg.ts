import { stringifySvg } from "lib/utils/stringify-svg"
import type {
  AnyCircuitElement,
  SimulationAnalysisResult,
  SimulationExperiment,
} from "circuit-json"
import { CIRCUIT_TO_SVG_VERSION } from "lib/package-version"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSoftwareUsedString } from "lib/utils/get-software-used-string"
import {
  type AcSweepView,
  getSimulationAnalysisResultId,
  normalizeSimulationAnalysisResults,
} from "./normalize-simulation-analysis-results"
export type { AcSweepView } from "./normalize-simulation-analysis-results"
import { createAxes } from "./simulation-graph-svg/create-axes"
import {
  buildAxisInfo,
  buildTimeAxisInfo,
} from "./simulation-graph-svg/create-axes/build-axis-info"
import { createBackgroundRect } from "./simulation-graph-svg/create-axes/create-background-rect"
import { createDefsNode } from "./simulation-graph-svg/create-axes/create-defs-node"
import { createGridLines } from "./simulation-graph-svg/create-axes/create-grid-lines"
import { createLinearScale } from "./simulation-graph-svg/create-axes/create-linear-scale"
import { createPlotBackground } from "./simulation-graph-svg/create-axes/create-plot-background"
import { createStyleNode } from "./simulation-graph-svg/create-axes/create-style-node"
import {
  createDataGroup,
  createTitleNode,
} from "./simulation-graph-svg/create-data-group"
import { createLegend } from "./simulation-graph-svg/create-legend"
import { createScopeLegend } from "./simulation-graph-svg/create-legend/create-scope-legend"
import { getScopeAxisGutters } from "./simulation-graph-svg/create-legend/get-scope-axis-gutters"
import { getScopeLegendGridLayout } from "./simulation-graph-svg/create-legend/get-scope-legend-grid-layout"
import { prepareSimulationGraphs } from "./simulation-graph-svg/prepare-simulation-graphs"
import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  MARGIN,
  SCOPE_LEGEND_GAP,
  type SimulationTransientGraph,
  createClipPathId,
  formatNumber,
  getYAxisTitle,
  svgElement,
  textNode,
} from "./simulation-graph-svg/simulation-graph-svg-shared"
import {
  type CircuitJsonWithSimulation,
  isSimulationAnalysisResult,
  isSimulationExperiment,
} from "./types"

interface ConvertSimulationGraphParams {
  circuitJson: CircuitJsonWithSimulation[]
  simulation_experiment_id: string
  simulation_transient_current_graph_ids?: string[]
  simulation_transient_voltage_graph_ids?: string[]
  simulation_result_ids?: string[]
  ac_sweep_view?: AcSweepView
  width?: number
  height?: number
  includeVersion?: boolean
  /** Override labels when rendering an already validated scalar preview. */
  x_axis_title?: string
  x_axis_display_scale?: number
  y_axis_title?: string
  y_axis_min?: number
  show_points?: boolean
  subtitle?: string
}

export function convertCircuitJsonToSimulationGraphSvg({
  circuitJson,
  simulation_experiment_id,
  simulation_transient_current_graph_ids,
  simulation_transient_voltage_graph_ids,
  simulation_result_ids,
  ac_sweep_view = "magnitude",
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  includeVersion,
  x_axis_title,
  x_axis_display_scale,
  y_axis_title,
  y_axis_min,
  show_points = true,
  subtitle,
}: ConvertSimulationGraphParams): string {
  const selectedVoltageIds = simulation_transient_voltage_graph_ids
    ? new Set(simulation_transient_voltage_graph_ids)
    : null
  const selectedCurrentIds = simulation_transient_current_graph_ids
    ? new Set(simulation_transient_current_graph_ids)
    : null
  const hasGraphSelection = Boolean(selectedVoltageIds || selectedCurrentIds)
  const selectedResultIds = simulation_result_ids
    ? new Set(simulation_result_ids)
    : null

  const experiment = circuitJson.find(
    (element): element is SimulationExperiment =>
      isSimulationExperiment(element) &&
      element.simulation_experiment_id === simulation_experiment_id,
  )

  const simulationResults = circuitJson.filter(
    (element): element is SimulationAnalysisResult =>
      isSimulationAnalysisResult(element) &&
      element.simulation_experiment_id === simulation_experiment_id &&
      (!selectedResultIds ||
        selectedResultIds.has(getSimulationAnalysisResultId(element))) &&
      (!hasGraphSelection ||
        (element.type === "simulation_transient_voltage_graph" &&
          (selectedVoltageIds?.has(
            element.simulation_transient_voltage_graph_id,
          ) ??
            false)) ||
        (element.type === "simulation_transient_current_graph" &&
          (selectedCurrentIds?.has(
            element.simulation_transient_current_graph_id,
          ) ??
            false))),
  )
  const normalizedResults = normalizeSimulationAnalysisResults({
    results: simulationResults,
    acSweepView: ac_sweep_view,
    experiment,
  })
  const graphs: SimulationTransientGraph[] = normalizedResults.graphs

  if (graphs.length === 0) {
    throw new Error(
      `No simulation analysis results found for simulation_experiment_id "${simulation_experiment_id}"`,
    )
  }

  const preparedGraphs = prepareSimulationGraphs(graphs, circuitJson)
  const allPoints = preparedGraphs.flatMap((entry) => entry.points)

  if (allPoints.length === 0) {
    throw new Error(
      `Simulation results for simulation_experiment_id "${simulation_experiment_id}" do not contain any datapoints`,
    )
  }

  const horizontalCoordinates = allPoints.map((point) => point.timeMs)
  let timeAxis
  if (normalizedResults.usesLogarithmicXValues) {
    timeAxis = buildLogarithmicAxisInfo(horizontalCoordinates)
  } else if (normalizedResults.xAxisTitle === "Time (ms)") {
    timeAxis = buildTimeAxisInfo({
      values: horizontalCoordinates,
      graphs,
      experiment,
    })
  } else {
    timeAxis = buildAxisInfo(horizontalCoordinates)
  }
  let valueAxis = buildAxisInfo(
    allPoints.map((point) => point.displayValue),
    true,
  )
  if (y_axis_min !== undefined) {
    if (!Number.isFinite(y_axis_min) || y_axis_min >= valueAxis.domainMax)
      throw new Error("Axis minimum must be finite and below its maximum")
    valueAxis = {
      ...valueAxis,
      domainMin: y_axis_min,
      ticks: [
        y_axis_min,
        ...valueAxis.ticks.filter((tick) => tick > y_axis_min),
      ],
    }
  }
  if (x_axis_display_scale !== undefined) {
    if (!Number.isFinite(x_axis_display_scale) || x_axis_display_scale <= 0)
      throw new Error("Axis display scale must be positive and finite")
    timeAxis = {
      ...timeAxis,
      tickLabelOverrides: new Map(
        timeAxis.ticks.map((tick) => [
          tick,
          formatNumber(tick * x_axis_display_scale),
        ]),
      ),
    }
  }
  const usesScopeTraceDisplay = preparedGraphs.some(
    (entry) => entry.usesScopeTraceDisplay,
  )
  const scopeAxisGutters = usesScopeTraceDisplay
    ? getScopeAxisGutters(preparedGraphs.length)
    : { left: 0, right: 0 }
  const outputWidth = width + scopeAxisGutters.left + scopeAxisGutters.right
  const scopeLegendLayout = usesScopeTraceDisplay
    ? getScopeLegendGridLayout(preparedGraphs.length, outputWidth)
    : null
  const outputHeight = scopeLegendLayout
    ? height + SCOPE_LEGEND_GAP + scopeLegendLayout.height + SCOPE_LEGEND_GAP
    : height

  const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right)
  const plotHeight = Math.max(1, height - MARGIN.top - MARGIN.bottom)
  const plotLeft = MARGIN.left + scopeAxisGutters.left

  const scaleX = createLinearScale(
    timeAxis.domainMin,
    timeAxis.domainMax,
    plotLeft,
    plotLeft + plotWidth,
  )
  const scaleY = createLinearScale(
    valueAxis.domainMin,
    valueAxis.domainMax,
    MARGIN.top + plotHeight,
    MARGIN.top,
  )

  const clipPathId = createClipPathId(simulation_experiment_id)
  const softwareUsedString = getSoftwareUsedString(
    circuitJson as AnyCircuitElement[],
  )
  const version = CIRCUIT_TO_SVG_VERSION

  const titleNode = createTitleNode(experiment, outputWidth)
  if (titleNode && subtitle)
    titleNode.attributes.style = `font-size: ${Math.min(18, (outputWidth - 32) / ((experiment?.name?.length ?? 1) * 0.6))}px`

  const svgChildren: SvgObject[] = [
    createStyleNode(),
    createBackgroundRect(outputWidth, outputHeight),
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
    createDataGroup(preparedGraphs, clipPathId, scaleX, scaleY, show_points),
    createAxes({
      timeAxis,
      valueAxis,
      graphs: preparedGraphs,
      scaleX,
      scaleY,
      plotLeft,
      plotWidth,
      plotHeight,
      yAxisTitle:
        y_axis_title ??
        normalizedResults.yAxisTitle ??
        getYAxisTitle(preparedGraphs),
      xAxisTitle: x_axis_title ?? normalizedResults.xAxisTitle,
      usesScopeTraceDisplay,
    }),
    usesScopeTraceDisplay
      ? createScopeLegend(preparedGraphs, outputWidth, height)
      : createLegend(preparedGraphs, outputWidth),
    ...(titleNode ? [titleNode] : []),
    ...(subtitle
      ? [
          svgElement(
            "text",
            {
              class: "legend-label",
              x: String(outputWidth / 2),
              y: "45",
              "text-anchor": "middle",
              style: `font-size: ${Math.min(12, (outputWidth - 32) / (subtitle.length * 0.6))}px`,
            },
            [textNode(subtitle)],
          ),
        ]
      : []),
  ]

  const svgObject: SvgObject = svgElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: outputWidth.toString(),
      height: outputHeight.toString(),
      style: `background-color: ${colorMap.schematic.background}`,
      viewBox: `0 0 ${formatNumber(outputWidth)} ${formatNumber(outputHeight)}`,
      "data-simulation-experiment-id": simulation_experiment_id,
      ...(experiment?.name && {
        "data-simulation-experiment-name": experiment.name,
      }),
      ...(softwareUsedString && {
        "data-software-used-string": softwareUsedString,
      }),
      ...(includeVersion && {
        "data-circuit-to-svg-version": version,
      }),
    },
    svgChildren,
  )

  return stringifySvg(svgObject)
}

const buildLogarithmicAxisInfo = (logarithmicCoordinates: number[]) => {
  const axisInfo = buildAxisInfo(logarithmicCoordinates)
  return {
    ...axisInfo,
    tickLabelOverrides: new Map(
      axisInfo.ticks.map((tick) => [tick, formatNumber(10 ** tick)]),
    ),
  }
}
