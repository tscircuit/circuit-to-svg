import type {
  AnyCircuitElement,
  SimulationExperiment,
  SimulationParameterSweep,
} from "circuit-json"
import { CIRCUIT_TO_SVG_VERSION } from "lib/package-version"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSoftwareUsedString } from "lib/utils/get-software-used-string"
import { stringify } from "svgson"
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
} from "./simulation-graph-svg/simulation-graph-svg-shared"
import {
  type CircuitJsonWithSimulation,
  type SimulationRenderableResult,
  isSimulationAnalysisResult,
  isSimulationExperiment,
  isSimulationMeasurementResult,
} from "./types"

export interface ConvertSimulationGraphParams {
  circuitJson: CircuitJsonWithSimulation[]
  simulation_experiment_id: string
  simulation_transient_current_graph_ids?: string[]
  simulation_transient_voltage_graph_ids?: string[]
  simulation_result_ids?: string[]
  series_colors?: string[]
  x_axis_max?: number
  x_axis_min?: number
  x_axis_tick_values?: number[]
  y_axis_max?: number
  y_axis_min?: number
  y_axis_tick_values?: number[]
  y_axis_title?: string
  ac_sweep_view?: AcSweepView
  width?: number
  height?: number
  includeVersion?: boolean
}

export function convertCircuitJsonToSimulationGraphSvg({
  circuitJson,
  simulation_experiment_id,
  simulation_transient_current_graph_ids,
  simulation_transient_voltage_graph_ids,
  simulation_result_ids,
  series_colors,
  x_axis_max,
  x_axis_min,
  x_axis_tick_values,
  y_axis_max,
  y_axis_min,
  y_axis_tick_values,
  y_axis_title,
  ac_sweep_view = "magnitude",
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  includeVersion,
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

  const matchingSimulationResults = circuitJson.filter(
    (element): element is SimulationRenderableResult =>
      (isSimulationAnalysisResult(element) ||
        isSimulationMeasurementResult(element)) &&
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
  const hasExplicitResultSelection = Boolean(
    selectedResultIds || hasGraphSelection,
  )
  const hasMeasurementResults = matchingSimulationResults.some(
    isSimulationMeasurementResult,
  )
  const simulationResults =
    !hasExplicitResultSelection && hasMeasurementResults
      ? matchingSimulationResults.filter(isSimulationMeasurementResult)
      : matchingSimulationResults
  const parameterSweeps = circuitJson.filter(
    (element): element is SimulationParameterSweep =>
      element.type === "simulation_parameter_sweep" &&
      element.simulation_experiment_id === simulation_experiment_id,
  )
  const normalizedResults = normalizeSimulationAnalysisResults({
    results: simulationResults,
    acSweepView: ac_sweep_view,
    experiment,
    parameterSweeps,
  })
  const graphs: SimulationTransientGraph[] = normalizedResults.graphs

  if (graphs.length === 0) {
    throw new Error(
      `No simulation analysis results found for simulation_experiment_id "${simulation_experiment_id}"`,
    )
  }

  const preparedGraphs = prepareSimulationGraphs(graphs, circuitJson).map(
    (graph, graphIndex) => ({
      ...graph,
      ...(series_colors?.length && {
        color: series_colors[graphIndex % series_colors.length],
      }),
    }),
  )
  const allPoints = preparedGraphs.flatMap((entry) => entry.points)

  if (allPoints.length === 0) {
    throw new Error(
      `Simulation results for simulation_experiment_id "${simulation_experiment_id}" do not contain any datapoints`,
    )
  }

  const horizontalCoordinates = allPoints.map((point) => point.timeMs)
  const timeAxis = normalizedResults.usesLogarithmicXValues
    ? buildLogarithmicAxisInfo({
        logarithmicCoordinates: horizontalCoordinates,
        maximum: getLogarithmicCoordinate(x_axis_max, "X"),
        minimum: getLogarithmicCoordinate(x_axis_min, "X"),
        tickValues: x_axis_tick_values?.map((tickValue) =>
          getRequiredLogarithmicCoordinate(tickValue, "X"),
        ),
      })
    : normalizedResults.xAxisTitle === "Time (ms)"
      ? applyAxisOverrides({
          axisInfo: buildTimeAxisInfo({
            values: horizontalCoordinates,
            graphs,
            experiment,
          }),
          maximum: x_axis_max,
          minimum: x_axis_min,
          tickValues: x_axis_tick_values,
        })
      : applyAxisOverrides({
          axisInfo: buildAxisInfo(horizontalCoordinates),
          maximum: x_axis_max,
          minimum: x_axis_min,
          tickValues: x_axis_tick_values,
        })
  const displayValues = allPoints.map((point) => point.displayValue)
  const valueAxis = normalizedResults.usesLogarithmicYValues
    ? buildLogarithmicAxisInfo({
        logarithmicCoordinates: displayValues,
        maximum: getLogarithmicCoordinate(y_axis_max, "Y"),
        minimum: getLogarithmicCoordinate(y_axis_min, "Y"),
        tickValues: y_axis_tick_values?.map((tickValue) =>
          getRequiredLogarithmicCoordinate(tickValue, "Y"),
        ),
      })
    : applyAxisOverrides({
        axisInfo: buildAxisInfo(displayValues, true),
        maximum: y_axis_max,
        minimum: y_axis_min,
        tickValues: y_axis_tick_values,
      })
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
    createDataGroup(preparedGraphs, clipPathId, scaleX, scaleY),
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
      xAxisTitle: normalizedResults.xAxisTitle,
      usesScopeTraceDisplay,
    }),
    usesScopeTraceDisplay
      ? createScopeLegend(preparedGraphs, outputWidth, height)
      : createLegend(preparedGraphs, outputWidth),
    ...(titleNode ? [titleNode] : []),
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

  return stringify(svgObject)
}

const buildLogarithmicAxisInfo = ({
  logarithmicCoordinates,
  maximum,
  minimum,
  tickValues,
}: {
  logarithmicCoordinates: number[]
  maximum?: number
  minimum?: number
  tickValues?: number[]
}) => {
  const hasAxisOverrides =
    maximum !== undefined || minimum !== undefined || tickValues !== undefined
  const axisInfo = applyAxisOverrides({
    axisInfo: buildAxisInfo(logarithmicCoordinates),
    maximum,
    minimum,
    tickValues,
  })
  const ticks =
    tickValues ??
    (hasAxisOverrides
      ? getLogarithmicTicks({
          minimum: axisInfo.domainMin,
          maximum: axisInfo.domainMax,
        })
      : axisInfo.ticks)
  return {
    ...axisInfo,
    ticks,
    tickLabelOverrides: new Map(
      ticks.map((tick) => [
        tick,
        hasAxisOverrides && !isLogarithmicMajorTick(tick)
          ? ""
          : formatNumber(10 ** tick),
      ]),
    ),
  }
}

const applyAxisOverrides = ({
  axisInfo,
  maximum,
  minimum,
  tickValues,
}: {
  axisInfo: ReturnType<typeof buildAxisInfo>
  maximum?: number
  minimum?: number
  tickValues?: number[]
}) => {
  const domainMin = minimum ?? axisInfo.domainMin
  const domainMax = maximum ?? axisInfo.domainMax
  if (
    !Number.isFinite(domainMin) ||
    !Number.isFinite(domainMax) ||
    domainMax <= domainMin
  ) {
    throw new Error(
      "Simulation graph axis bounds must be finite and increasing",
    )
  }

  const ticks = (tickValues ?? axisInfo.ticks).filter(
    (tickValue) => tickValue >= domainMin && tickValue <= domainMax,
  )
  if (!ticks.some((tickValue) => Math.abs(tickValue - domainMin) < 1e-12)) {
    ticks.unshift(domainMin)
  }
  if (!ticks.some((tickValue) => Math.abs(tickValue - domainMax) < 1e-12)) {
    ticks.push(domainMax)
  }

  return {
    ...axisInfo,
    domainMin,
    domainMax,
    ticks: Array.from(new Set(ticks)).sort((left, right) => left - right),
  }
}

const getLogarithmicCoordinate = (
  axisValue: number | undefined,
  axisName: "X" | "Y",
) =>
  axisValue === undefined
    ? undefined
    : getRequiredLogarithmicCoordinate(axisValue, axisName)

const getRequiredLogarithmicCoordinate = (
  axisValue: number,
  axisName: "X" | "Y",
) => {
  if (!Number.isFinite(axisValue) || axisValue <= 0) {
    throw new Error(
      `Logarithmic ${axisName}-axis values must be positive; received ${axisValue}`,
    )
  }
  return Math.log10(axisValue)
}

const getLogarithmicTicks = ({
  maximum,
  minimum,
}: {
  maximum: number
  minimum: number
}) => {
  const ticks: number[] = []
  for (
    let exponent = Math.floor(minimum);
    exponent <= Math.ceil(maximum);
    exponent++
  ) {
    for (let multiplier = 1; multiplier <= 9; multiplier++) {
      const tickValue = Math.log10(multiplier * 10 ** exponent)
      if (tickValue >= minimum - 1e-12 && tickValue <= maximum + 1e-12) {
        ticks.push(tickValue)
      }
    }
  }
  return ticks
}

const isLogarithmicMajorTick = (axisValue: number) =>
  Math.abs(axisValue - Math.round(axisValue)) < 1e-12
