import type {
  SimulationCurrentProbe,
  SimulationVoltageProbe,
} from "circuit-json"
import {
  type SimulationProbe,
  type SimulationTransientGraph,
  isCurrentGraph,
} from "../simulation-graph-svg-shared"
import { getStringProperty } from "./get-string-property"

export function getProbeForGraph(
  graph: SimulationTransientGraph,
  voltageProbeIdToProbe: Map<string, SimulationVoltageProbe>,
  currentProbeIdToProbe: Map<string, SimulationCurrentProbe>,
  sourceComponentIdToVoltageProbe: Map<string, SimulationVoltageProbe>,
  sourceComponentIdToCurrentProbe: Map<string, SimulationCurrentProbe>,
): SimulationProbe | undefined {
  const sourceProbeId = getStringProperty(graph, "source_probe_id")
  if (sourceProbeId) {
    const probe = isCurrentGraph(graph)
      ? currentProbeIdToProbe.get(sourceProbeId)
      : voltageProbeIdToProbe.get(sourceProbeId)
    if (probe) return probe
  }

  if (!graph.source_component_id) return undefined
  return isCurrentGraph(graph)
    ? sourceComponentIdToCurrentProbe.get(graph.source_component_id)
    : sourceComponentIdToVoltageProbe.get(graph.source_component_id)
}
