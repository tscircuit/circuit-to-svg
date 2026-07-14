import type {
  AnyCircuitElement,
  SimulationCurrentProbe,
  SimulationExperiment,
  SimulationExperimentError,
  SimulationOperatingPointCurrent,
  SimulationOperatingPointVoltage,
  SimulationOscilloscopeTrace,
  SimulationTransientCurrentGraph,
  SimulationTransientVoltageGraph,
  SimulationVoltageProbe,
} from "circuit-json"

export type CircuitJsonWithSimulation =
  | AnyCircuitElement
  | SimulationExperiment
  | SimulationExperimentError
  | SimulationOperatingPointCurrent
  | SimulationOperatingPointVoltage
  | SimulationTransientCurrentGraph
  | SimulationTransientVoltageGraph
  | SimulationCurrentProbe
  | SimulationVoltageProbe
  | SimulationOscilloscopeTrace

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

export function isSimulationExperimentError(
  value: CircuitJsonWithSimulation,
): value is SimulationExperimentError {
  return value?.type === "simulation_experiment_error"
}

export function isSimulationOperatingPointVoltage(
  value: CircuitJsonWithSimulation,
): value is SimulationOperatingPointVoltage {
  return value?.type === "simulation_operating_point_voltage"
}

export function isSimulationOperatingPointCurrent(
  value: CircuitJsonWithSimulation,
): value is SimulationOperatingPointCurrent {
  return value?.type === "simulation_operating_point_current"
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
