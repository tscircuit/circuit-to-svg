import type {
  AnyCircuitElement,
  SimulationAnalysisResult,
  SimulationCurrentProbe,
  SimulationExperiment,
  SimulationOscilloscopeTrace,
  SimulationTransientCurrentGraph,
  SimulationTransientVoltageGraph,
  SimulationVoltageProbe,
} from "circuit-json"

export type CircuitJsonWithSimulation = AnyCircuitElement
export type { SimulationAnalysisResult } from "circuit-json"

export function isSimulationAnalysisResult(
  circuitElement: Pick<AnyCircuitElement, "type">,
): circuitElement is SimulationAnalysisResult {
  return (
    circuitElement.type === "simulation_transient_voltage_graph" ||
    circuitElement.type === "simulation_transient_current_graph" ||
    circuitElement.type === "simulation_dc_operating_point_voltage" ||
    circuitElement.type === "simulation_dc_operating_point_current" ||
    circuitElement.type === "simulation_dc_sweep_voltage_graph" ||
    circuitElement.type === "simulation_dc_sweep_current_graph" ||
    circuitElement.type === "simulation_ac_sweep_voltage_graph" ||
    circuitElement.type === "simulation_ac_sweep_current_graph"
  )
}

export function isSimulationTransientCurrentGraph(
  value: CircuitJsonWithSimulation,
): value is SimulationTransientCurrentGraph {
  return value?.type === "simulation_transient_current_graph"
}

export function isSimulationTransientVoltageGraph(
  value: CircuitJsonWithSimulation,
): value is SimulationTransientVoltageGraph {
  return value?.type === "simulation_transient_voltage_graph"
}

export function isSimulationExperiment(
  value: CircuitJsonWithSimulation,
): value is SimulationExperiment {
  return value?.type === "simulation_experiment"
}

export function isSimulationVoltageProbe(
  value: CircuitJsonWithSimulation,
): value is SimulationVoltageProbe {
  return value?.type === "simulation_voltage_probe"
}

export function isSimulationCurrentProbe(
  value: CircuitJsonWithSimulation,
): value is SimulationCurrentProbe {
  return value?.type === "simulation_current_probe"
}

export function isSimulationOscilloscopeTrace(
  value: CircuitJsonWithSimulation,
): value is SimulationOscilloscopeTrace {
  return value?.type === "simulation_oscilloscope_trace"
}
