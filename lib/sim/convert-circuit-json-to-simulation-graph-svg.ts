import type {
  AnyCircuitElement,
  SimulationExperiment,
  SimulationTransientCurrentGraph,
  SimulationTransientVoltageGraph,
} from "circuit-json"
import { CIRCUIT_TO_SVG_VERSION } from "lib/package-version"
import type { SvgObject } from "lib/svg-object"
import { getSoftwareUsedString } from "lib/utils/get-software-used-string"
import { stringify } from "svgson"
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
  isSimulationExperiment,
  isSimulationTransientCurrentGraph,
  isSimulationTransientVoltageGraph,
} from "./types"

interface ConvertSimulationGraphParams {
  circuitJson: CircuitJsonWithSimulation[]
  simulation_experiment_id: string
  simulation_transient_current_graph_ids?: string[]
  simulation_transient_voltage_graph_ids?: string[]
  width?: number
  height?: number
  includeVersion?: boolean
  displayWidthForLayout?: number
}

export function convertCircuitJsonToSimulationGraphSvg({
  circuitJson,
  simulation_experiment_id,
  simulation_transient_current_graph_ids,
  simulation_transient_voltage_graph_ids,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  includeVersion,
  displayWidthForLayout,
}: ConvertSimulationGraphParams): string {
  const selectedVoltageIds = simulation_transient_voltage_graph_ids
    ? new Set(simulation_transient_voltage_graph_ids)
    : null
  const selectedCurrentIds = simulation_transient_current_graph_ids
    ? new Set(simulation_transient_current_graph_ids)
    : null
  const hasGraphSelection = Boolean(selectedVoltageIds || selectedCurrentIds)

  const experiment = circuitJson.find(
    (element): element is SimulationExperiment =>
      isSimulationExperiment(element) &&
      element.simulation_experiment_id === simulation_experiment_id,
  )

  const voltageGraphs = circuitJson.filter(
    (element): element is SimulationTransientVoltageGraph =>
      isSimulationTransientVoltageGraph(element) &&
      element.simulation_experiment_id === simulation_experiment_id &&
      (!hasGraphSelection ||
        (selectedVoltageIds?.has(
          element.simulation_transient_voltage_graph_id,
        ) ??
          false)),
  )
  const currentGraphs = circuitJson.filter(
    (element): element is SimulationTransientCurrentGraph =>
      isSimulationTransientCurrentGraph(element) &&
      element.simulation_experiment_id === simulation_experiment_id &&
      (!hasGraphSelection ||
        (selectedCurrentIds?.has(
          element.simulation_transient_current_graph_id,
        ) ??
          false)),
  )
  const graphs: SimulationTransientGraph[] = [
    ...voltageGraphs,
    ...currentGraphs,
  ]

  if (graphs.length === 0) {
    throw new Error(
      `No simulation_transient_voltage_graph or simulation_transient_current_graph elements found for simulation_experiment_id "${simulation_experiment_id}"`,
    )
  }

  const preparedGraphs = prepareSimulationGraphs(graphs, circuitJson)
  const allPoints = preparedGraphs.flatMap((entry) => entry.points)

  if (allPoints.length === 0) {
    throw new Error(
      `simulation transient graph elements for simulation_experiment_id "${simulation_experiment_id}" do not contain any datapoints`,
    )
  }

  const timeAxis = buildTimeAxisInfo({
    values: allPoints.map((point) => point.timeMs),
    graphs,
    experiment,
  })
  const valueAxis = buildAxisInfo(
    allPoints.map((point) => point.displayValue),
    true,
  )
  const usesScopeTraceDisplay = preparedGraphs.some(
    (entry) => entry.usesScopeTraceDisplay,
  )
  const scopeAxisGutters = usesScopeTraceDisplay
    ? getScopeAxisGutters(preparedGraphs.length)
    : { left: 0, right: 0 }
  const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right)
  const plotLeft = MARGIN.left + scopeAxisGutters.left
  const outputWidth = width + scopeAxisGutters.left + scopeAxisGutters.right
  const scopeLegendLayout = usesScopeTraceDisplay
    ? getScopeLegendGridLayout(preparedGraphs.length, outputWidth, {
        displayWidth: displayWidthForLayout,
      })
    : null
  const outputHeight = scopeLegendLayout
    ? height + SCOPE_LEGEND_GAP + scopeLegendLayout.height + SCOPE_LEGEND_GAP
    : height

  const plotHeight = Math.max(1, height - MARGIN.top - MARGIN.bottom)

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
      yAxisTitle: getYAxisTitle(preparedGraphs),
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
