import type {
  SimulationCurrentProbe,
  SimulationOscilloscopeTrace,
  SimulationVoltageProbe,
} from "circuit-json"
import { colorMap } from "lib/utils/colors"
import {
  type CircuitJsonWithSimulation,
  isSimulationCurrentProbe,
  isSimulationOscilloscopeTrace,
  isSimulationVoltageProbe,
} from "../types"
import { createGraphPoints } from "./prepare-simulation-graphs/create-graph-points"
import { getGraphLabel } from "./prepare-simulation-graphs/get-graph-label"
import { getOscilloscopeTraceForGraph } from "./prepare-simulation-graphs/get-oscilloscope-trace-for-graph"
import { getProbeForGraph } from "./prepare-simulation-graphs/get-probe-for-graph"
import { getScopeTraceDisplay } from "./prepare-simulation-graphs/get-scope-trace-display"
import {
  FALLBACK_LINE_COLOR,
  type PreparedSimulationGraph,
  type SimulationProbe,
  type SimulationTransientGraph,
  isCurrentGraph,
  isUsableScopeTraceDisplay,
} from "./simulation-graph-svg-shared"

export function prepareSimulationGraphs(
  graphs: SimulationTransientGraph[],
  circuitJson: CircuitJsonWithSimulation[],
): PreparedSimulationGraph[] {
  const palette = Array.isArray(colorMap.simulation_palette)
    ? colorMap.simulation_palette
    : Array.isArray(colorMap.palette)
      ? colorMap.palette
      : []

  const voltageProbes = circuitJson.filter(isSimulationVoltageProbe)
  const currentProbes = circuitJson.filter(isSimulationCurrentProbe)
  const oscilloscopeTraces = circuitJson.filter(isSimulationOscilloscopeTrace)
  const sourceComponentIdToVoltageProbeName = new Map<string, string>()
  const sourceComponentIdToVoltageProbeColor = new Map<string, string>()
  const sourceComponentIdToCurrentProbeName = new Map<string, string>()
  const sourceComponentIdToCurrentProbeColor = new Map<string, string>()
  const voltageProbeIdToProbe = new Map<string, SimulationVoltageProbe>()
  const currentProbeIdToProbe = new Map<string, SimulationCurrentProbe>()
  const sourceComponentIdToVoltageProbe = new Map<
    string,
    SimulationVoltageProbe
  >()
  const sourceComponentIdToCurrentProbe = new Map<
    string,
    SimulationCurrentProbe
  >()
  const traceByVoltageGraphId = new Map<string, SimulationOscilloscopeTrace>()
  const traceByCurrentGraphId = new Map<string, SimulationOscilloscopeTrace>()
  const traceByVoltageProbeId = new Map<string, SimulationOscilloscopeTrace>()
  const traceByCurrentProbeId = new Map<string, SimulationOscilloscopeTrace>()

  for (const trace of oscilloscopeTraces) {
    if (trace.simulation_transient_voltage_graph_id) {
      traceByVoltageGraphId.set(
        trace.simulation_transient_voltage_graph_id,
        trace,
      )
    }
    if (trace.simulation_transient_current_graph_id) {
      traceByCurrentGraphId.set(
        trace.simulation_transient_current_graph_id,
        trace,
      )
    }
    if (trace.simulation_voltage_probe_id) {
      traceByVoltageProbeId.set(trace.simulation_voltage_probe_id, trace)
    }
    if (trace.simulation_current_probe_id) {
      traceByCurrentProbeId.set(trace.simulation_current_probe_id, trace)
    }
  }

  for (const probe of voltageProbes) {
    voltageProbeIdToProbe.set(probe.simulation_voltage_probe_id, probe)
    if (probe.name && probe.source_component_id) {
      sourceComponentIdToVoltageProbeName.set(
        probe.source_component_id,
        probe.name,
      )
    }
    if (probe.color && probe.source_component_id) {
      sourceComponentIdToVoltageProbeColor.set(
        probe.source_component_id,
        probe.color,
      )
    }
    if (probe.source_component_id) {
      sourceComponentIdToVoltageProbe.set(probe.source_component_id, probe)
    }
  }

  for (const probe of currentProbes) {
    currentProbeIdToProbe.set(probe.simulation_current_probe_id, probe)
    if (probe.name && probe.source_component_id) {
      sourceComponentIdToCurrentProbeName.set(
        probe.source_component_id,
        probe.name,
      )
    }
    if (probe.color && probe.source_component_id) {
      sourceComponentIdToCurrentProbeColor.set(
        probe.source_component_id,
        probe.color,
      )
    }
    if (probe.source_component_id) {
      sourceComponentIdToCurrentProbe.set(probe.source_component_id, probe)
    }
  }

  return graphs
    .map((graph, index) => {
      const probe = getProbeForGraph(
        graph,
        voltageProbeIdToProbe,
        currentProbeIdToProbe,
        sourceComponentIdToVoltageProbe,
        sourceComponentIdToCurrentProbe,
      )
      const trace = getOscilloscopeTraceForGraph(
        graph,
        probe,
        traceByVoltageGraphId,
        traceByCurrentGraphId,
        traceByVoltageProbeId,
        traceByCurrentProbeId,
      )
      const scopeTraceDisplay = getScopeTraceDisplay(graph, trace)
      const points = createGraphPoints(graph, scopeTraceDisplay)
      const paletteColor = getPaletteColor(palette, index)
      const probeColor = getProbeColor(
        graph,
        probe,
        isCurrentGraph(graph)
          ? sourceComponentIdToCurrentProbeColor
          : sourceComponentIdToVoltageProbeColor,
      )
      const color =
        graph.color ?? scopeTraceDisplay?.color ?? probeColor ?? paletteColor
      const label = getGraphLabel(
        graph,
        probe,
        scopeTraceDisplay,
        isCurrentGraph(graph)
          ? sourceComponentIdToCurrentProbeName
          : sourceComponentIdToVoltageProbeName,
      )

      return {
        graph,
        points,
        color,
        label,
        scopeTraceDisplay,
        usesScopeTraceDisplay: isUsableScopeTraceDisplay(scopeTraceDisplay),
      }
    })
    .filter((entry) => entry.points.length > 0)
}

function getPaletteColor(palette: string[], index: number): string {
  if (palette.length === 0) return FALLBACK_LINE_COLOR
  return palette[index % palette.length] ?? FALLBACK_LINE_COLOR
}

function getProbeColor(
  graph: SimulationTransientGraph,
  probe: SimulationProbe | undefined,
  sourceComponentIdToProbeColor: Map<string, string>,
): string | undefined {
  if (probe?.color) return probe.color
  if (!graph.source_component_id) return undefined
  return sourceComponentIdToProbeColor.get(graph.source_component_id)
}
