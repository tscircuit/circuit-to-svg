import type {
  AnyCircuitElement,
  SimulationExperiment,
  SimulationTransientVoltageGraph,
  SimulationVoltageProbe,
} from "circuit-json"

export type CircuitJsonWithSimulation =
  | AnyCircuitElement
  | SimulationExperiment
  | SimulationTransientVoltageGraph
  | SimulationVoltageProbe

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
