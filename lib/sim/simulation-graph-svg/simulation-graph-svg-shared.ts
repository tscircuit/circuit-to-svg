import type {
  SimulationCurrentProbe,
  SimulationTransientCurrentGraph,
  SimulationTransientVoltageGraph,
  SimulationVoltageProbe,
} from "circuit-json"
import type { SvgObject } from "lib/svg-object"

export type SimulationTransientGraph =
  | SimulationTransientVoltageGraph
  | SimulationTransientCurrentGraph

export type SimulationProbe = SimulationVoltageProbe | SimulationCurrentProbe

export interface SimulationScopeTraceDisplay {
  displayName?: string
  color?: string
  center?: number
  offsetDivs?: number
  valuePerDiv?: number
}

export function isUsableScopeTraceDisplay(
  scopeTraceDisplay?: SimulationScopeTraceDisplay,
): scopeTraceDisplay is SimulationScopeTraceDisplay & {
  valuePerDiv: number
} {
  return (
    scopeTraceDisplay?.valuePerDiv !== undefined &&
    Number.isFinite(scopeTraceDisplay.valuePerDiv) &&
    Math.abs(scopeTraceDisplay.valuePerDiv) > Number.EPSILON
  )
}

export interface PreparedSimulationGraph {
  graph: SimulationTransientGraph
  points: Array<{ timeMs: number; rawValue: number; displayValue: number }>
  color: string
  label: string
  scopeTraceDisplay?: SimulationScopeTraceDisplay
  usesScopeTraceDisplay: boolean
}

export interface AxisInfo {
  domainMin: number
  domainMax: number
  ticks: number[]
  tickLabelOverrides?: Map<number, string>
}

export type ScaleFn = (value: number) => number

export const DEFAULT_WIDTH = 1200
export const DEFAULT_HEIGHT = 600
export const MARGIN = { top: 64, right: 100, bottom: 80, left: 100 }
export const SCOPE_LEGEND_GAP = 24
export const SCOPE_AXIS_SPACING = 56
export const SCOPE_AXIS_LABEL_WIDTH = 56
export const SCOPE_AXIS_LABEL_PADDING = 8
export const FALLBACK_LINE_COLOR = "#1f77b4"

export function isCurrentGraph(
  graph: SimulationTransientGraph,
): graph is SimulationTransientCurrentGraph {
  return graph.type === "simulation_transient_current_graph"
}

export function getGraphId(graph: SimulationTransientGraph): string {
  return isCurrentGraph(graph)
    ? graph.simulation_transient_current_graph_id
    : graph.simulation_transient_voltage_graph_id
}

export function getGraphIdDataAttributeName(
  graph: SimulationTransientGraph,
): string {
  return isCurrentGraph(graph)
    ? "data-simulation-transient-current-graph-id"
    : "data-simulation-transient-voltage-graph-id"
}

export function getGraphLevels(graph: SimulationTransientGraph): number[] {
  return isCurrentGraph(graph) ? graph.current_levels : graph.voltage_levels
}

export function getYAxisTitle(graphs: PreparedSimulationGraph[]): string {
  const hasCurrentGraphs = graphs.some((entry) => isCurrentGraph(entry.graph))
  const hasVoltageGraphs = graphs.some((entry) => !isCurrentGraph(entry.graph))

  if (hasCurrentGraphs && !hasVoltageGraphs) return "Current (A)"
  if (hasVoltageGraphs && !hasCurrentGraphs) return "Voltage (V)"
  return "Value"
}

export function createClipPathId(simulationExperimentId: string): string {
  const sanitized = simulationExperimentId.replace(/[^a-zA-Z0-9_-]+/g, "-")
  return `simulation-graph-${sanitized}`
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const rounded = Number.parseFloat(value.toFixed(6))
  if (Number.isInteger(rounded)) return rounded.toString()
  return rounded.toString()
}

export function svgElement(
  name: string,
  attributes: Record<string, string>,
  children: SvgObject[] = [],
): SvgObject {
  return {
    name,
    type: "element",
    value: "",
    attributes,
    children,
  }
}

export function textNode(value: string): SvgObject {
  return {
    name: "",
    type: "text",
    value,
    attributes: {},
    children: [],
  }
}
