import {
  type SimulationProbe,
  type SimulationScopeTraceDisplay,
  type SimulationTransientGraph,
  getGraphId,
  isCurrentGraph,
} from "../simulation-graph-svg-shared"
import { getStringProperty } from "./get-string-property"

export function getGraphLabel(
  graph: SimulationTransientGraph,
  probe: SimulationProbe | undefined,
  scopeTraceDisplay: SimulationScopeTraceDisplay | undefined,
  sourceComponentIdToProbeName: Map<string, string>,
): string {
  const prefix = isCurrentGraph(graph) ? "I" : "V"
  if (scopeTraceDisplay?.displayName) return scopeTraceDisplay.displayName
  if (graph.simulation_parameter_sweep_coordinate && graph.name) {
    return graph.name
  }
  if (probe?.name) return `${prefix}(${probe.name})`

  const sourceProbeName = getStringProperty(graph, "source_probe_name")
  if (sourceProbeName) return `${prefix}(${sourceProbeName})`

  if (graph.source_component_id) {
    const probeName = sourceComponentIdToProbeName.get(
      graph.source_component_id,
    )
    if (probeName) return `${prefix}(${probeName})`
  }

  if (graph.name) return graph.name
  if (graph.source_component_id) return `Probe ${graph.source_component_id}`
  return getGraphId(graph)
}
