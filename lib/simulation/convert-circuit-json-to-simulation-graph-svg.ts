import type { AnyCircuitElement } from "circuit-json"
import { stringify, type INode as SvgObject } from "svgson"
import { getSoftwareUsedString } from "../utils/get-software-used-string"
import { CIRCUIT_TO_SVG_VERSION } from "../package-version"
import {
  createSimulationGraphSvgObjects,
  type SimulationGraphLineDefinition,
} from "./svg-object-fns/create-simulation-graph-svg-objects"

interface SimulationExperiment {
  type: "simulation_experiment"
  simulation_experiment_id: string
  name: string
  experiment_type: string
  simulation_transient_voltage_graph_ids?: string[]
  graphs_to_show?: string[]
}

interface SimulationTransientVoltageGraph {
  type: "simulation_transient_voltage_graph"
  simulation_transient_voltage_graph_id: string
  simulation_experiment_id: string
  timestamps_ms?: number[]
  voltage_levels: number[]
  schematic_voltage_probe_id?: string
  subcircuit_connecivity_map_key?: string
  time_per_step: number
  start_time_ms: number
  end_time_ms: number
  name?: string
  color?: string
}

type SimulationCircuitElement =
  | AnyCircuitElement
  | SimulationExperiment
  | SimulationTransientVoltageGraph

const LINE_COLORS = [
  "#2563EB",
  "#DC2626",
  "#16A34A",
  "#9333EA",
  "#F97316",
  "#0891B2",
  "#FACC15",
  "#7C3AED",
]

export interface ConvertCircuitJsonToSimulationGraphSvgArgs {
  simulation_experiment_id: string
  circuitJson: SimulationCircuitElement[]
  simulation_transient_voltage_graph_ids?: string[]
  width?: number
  height?: number
  includeVersion?: boolean
  xLabel?: string
  yLabel?: string
}

export function convertCircuitJsonToSimulationGraphSvg(
  args: ConvertCircuitJsonToSimulationGraphSvgArgs,
): string {
  const {
    simulation_experiment_id,
    circuitJson,
    simulation_transient_voltage_graph_ids,
    width = 900,
    height = 520,
    includeVersion = true,
    xLabel = "Time (ms)",
    yLabel = "Voltage (V)",
  } = args

  const experiment = circuitJson.find(
    (element): element is SimulationExperiment =>
      isSimulationExperiment(element) &&
      element.simulation_experiment_id === simulation_experiment_id,
  )

  if (!experiment) {
    throw new Error(
      `No simulation_experiment found with id \"${simulation_experiment_id}\"`,
    )
  }

  const desiredGraphIds = resolveDesiredGraphIds({
    explicitIds: simulation_transient_voltage_graph_ids,
    experiment,
  })

  const transientGraphs = circuitJson
    .filter(isSimulationTransientVoltageGraph)
    .filter(
      (graph) => graph.simulation_experiment_id === simulation_experiment_id,
    )

  const graphsToRender = desiredGraphIds
    ? transientGraphs.filter((graph) =>
        desiredGraphIds.has(graph.simulation_transient_voltage_graph_id),
      )
    : transientGraphs

  if (graphsToRender.length === 0) {
    throw new Error(
      `No simulation_transient_voltage_graph found for simulation_experiment_id \"${simulation_experiment_id}\"`,
    )
  }

  const lineDefinitions: SimulationGraphLineDefinition[] = graphsToRender
    .map((graph, index) => createLineDefinition(graph, index))
    .filter((line) => line.points.length > 0)

  const svgChildren = createSimulationGraphSvgObjects({
    width,
    height,
    experimentName: experiment.name || "Simulation Experiment",
    xLabel,
    yLabel,
    lines: lineDefinitions,
  })

  const softwareUsedString = getSoftwareUsedString(
    circuitJson as AnyCircuitElement[],
  )
  const svgObject: SvgObject = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: width.toString(),
      height: height.toString(),
      viewBox: `0 0 ${width} ${height}`,
      ...(softwareUsedString && {
        "data-software-used-string": softwareUsedString,
      }),
      ...(includeVersion && {
        "data-circuit-to-svg-version": CIRCUIT_TO_SVG_VERSION,
      }),
    },
    children: [
      {
        name: "rect",
        type: "element",
        attributes: {
          x: "0",
          y: "0",
          width: width.toString(),
          height: height.toString(),
          fill: "#FFFFFF",
        },
        children: [],
        value: "",
      },
      ...svgChildren,
    ],
    value: "",
  }

  return stringify(svgObject)
}

function resolveDesiredGraphIds({
  explicitIds,
  experiment,
}: {
  explicitIds?: string[]
  experiment: SimulationExperiment
}): Set<string> | undefined {
  const experimentIds =
    experiment.simulation_transient_voltage_graph_ids ??
    experiment.graphs_to_show ??
    []

  const ids = explicitIds ?? experimentIds

  if (!ids || ids.length === 0) {
    return undefined
  }

  return new Set(ids)
}

function createLineDefinition(
  graph: SimulationTransientVoltageGraph,
  index: number,
): SimulationGraphLineDefinition {
  const timestamps = resolveTimestamps(graph)

  const points = graph.voltage_levels
    .map((voltage, pointIndex) => ({
      voltage,
      timeMs: timestamps[pointIndex],
    }))
    .filter(
      (point): point is { timeMs: number; voltage: number } =>
        Number.isFinite(point.timeMs) && Number.isFinite(point.voltage),
    )

  const fallbackColor =
    LINE_COLORS[index % LINE_COLORS.length] ?? LINE_COLORS[0]
  const color = (graph.color ?? fallbackColor) as string

  return {
    id: graph.simulation_transient_voltage_graph_id,
    name: getGraphDisplayName(graph, index),
    color,
    points,
  }
}

function resolveTimestamps(graph: SimulationTransientVoltageGraph): number[] {
  if (graph.timestamps_ms && graph.timestamps_ms.length > 0) {
    if (graph.timestamps_ms.length >= graph.voltage_levels.length) {
      return graph.timestamps_ms.slice(0, graph.voltage_levels.length)
    }

    return graph.timestamps_ms
  }

  const count = graph.voltage_levels.length
  const timestamps: number[] = []
  for (let index = 0; index < count; index += 1) {
    const timestamp = graph.start_time_ms + graph.time_per_step * index
    timestamps.push(timestamp)
  }

  return timestamps
}

function getGraphDisplayName(
  graph: SimulationTransientVoltageGraph,
  index: number,
): string {
  if (graph.name) {
    return graph.name
  }

  if (graph.schematic_voltage_probe_id) {
    return `Probe ${graph.schematic_voltage_probe_id}`
  }

  return `Graph ${index + 1}`
}

function isSimulationExperiment(
  element: SimulationCircuitElement,
): element is SimulationExperiment {
  return (
    typeof element === "object" &&
    element !== null &&
    (element as { type?: string }).type === "simulation_experiment"
  )
}

function isSimulationTransientVoltageGraph(
  element: SimulationCircuitElement,
): element is SimulationTransientVoltageGraph {
  return (
    typeof element === "object" &&
    element !== null &&
    (element as { type?: string }).type === "simulation_transient_voltage_graph"
  )
}

export default convertCircuitJsonToSimulationGraphSvg
