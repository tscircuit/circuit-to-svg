import type { SimulationOscilloscopeTrace } from "circuit-json"
import {
  type SimulationProbe,
  type SimulationTransientGraph,
  isCurrentGraph,
} from "../simulation-graph-svg-shared"
import { getStringProperty } from "./get-string-property"

export function getOscilloscopeTraceForGraph(
  graph: SimulationTransientGraph,
  probe: SimulationProbe | undefined,
  traceByVoltageGraphId: Map<string, SimulationOscilloscopeTrace>,
  traceByCurrentGraphId: Map<string, SimulationOscilloscopeTrace>,
  traceByVoltageProbeId: Map<string, SimulationOscilloscopeTrace>,
  traceByCurrentProbeId: Map<string, SimulationOscilloscopeTrace>,
): SimulationOscilloscopeTrace | undefined {
  if (isCurrentGraph(graph)) {
    const graphTrace = traceByCurrentGraphId.get(
      graph.simulation_transient_current_graph_id,
    )
    if (graphTrace) return graphTrace

    const sourceProbeId =
      getStringProperty(graph, "source_probe_id") ??
      (probe?.type === "simulation_current_probe"
        ? probe.simulation_current_probe_id
        : undefined)
    return sourceProbeId ? traceByCurrentProbeId.get(sourceProbeId) : undefined
  }

  const graphTrace = traceByVoltageGraphId.get(
    graph.simulation_transient_voltage_graph_id,
  )
  if (graphTrace) return graphTrace

  const sourceProbeId =
    getStringProperty(graph, "source_probe_id") ??
    (probe?.type === "simulation_voltage_probe"
      ? probe.simulation_voltage_probe_id
      : undefined)
  return sourceProbeId ? traceByVoltageProbeId.get(sourceProbeId) : undefined
}
