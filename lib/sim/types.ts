import type { AnyCircuitElement } from "circuit-json"

export type ExperimentType = string

export interface SimulationExperimentElement {
  type: "simulation_experiment"
  simulation_experiment_id: string
  name: string
  experiment_type: ExperimentType
}

export interface SimulationTransientVoltageGraphElement {
  type: "simulation_transient_voltage_graph"
  simulation_transient_voltage_graph_id: string
  simulation_experiment_id: string
  timestamps_ms?: number[]
  voltage_levels: number[]
  simulation_voltage_probe_id?: string
  subcircuit_connecivity_map_key?: string
  time_per_step: number
  start_time_ms: number
  end_time_ms: number
  name?: string
}

export interface SimulationVoltageProbeElement {
  type: "simulation_voltage_probe"
  simulation_voltage_probe_id: string
  name: string
  source_port_id?: string
  source_net_id?: string
}

export type CircuitJsonWithSimulation =
  | AnyCircuitElement
  | SimulationExperimentElement
  | SimulationTransientVoltageGraphElement
  | SimulationVoltageProbeElement

export function isSimulationTransientVoltageGraph(
  value: CircuitJsonWithSimulation,
): value is SimulationTransientVoltageGraphElement {
  return value?.type === "simulation_transient_voltage_graph"
}

export function isSimulationExperiment(
  value: CircuitJsonWithSimulation,
): value is SimulationExperimentElement {
  return value?.type === "simulation_experiment"
}

export function isSimulationVoltageProbe(
  value: CircuitJsonWithSimulation,
): value is SimulationVoltageProbeElement {
  return value?.type === "simulation_voltage_probe"
}
