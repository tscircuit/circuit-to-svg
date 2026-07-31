import type {
  AnyCircuitElement,
  SimulationAnalysisResult as CircuitJsonSimulationAnalysisResult,
  SimulationParameterSweep as CircuitJsonSimulationParameterSweep,
  SimulationCurrentProbe,
  SimulationExperiment,
  SimulationOscilloscopeTrace,
  SimulationParameterSweepCoordinate,
  SimulationTransientCurrentGraph,
  SimulationTransientVoltageGraph,
  SimulationVoltageProbe,
} from "circuit-json"

export type SimulationAnalysisResult = CircuitJsonSimulationAnalysisResult & {
  simulation_parameter_sweep_coordinates?: SimulationParameterSweepCoordinate[]
}

export type SimulationParameterSweep = CircuitJsonSimulationParameterSweep & {
  display_parameter_values?: number[]
  display_parameter_unit?: string
}

export interface SimulationMeasurementResult {
  type: "simulation_measurement_result"
  simulation_measurement_result_id: string
  simulation_experiment_id: string
  name: string
  measurement_values: number[]
  measurement_unit: string
  simulation_parameter_sweep_coordinate_sets?: SimulationParameterSweepCoordinate[][]
}

export type CircuitJsonWithSimulation =
  | Exclude<
      AnyCircuitElement,
      CircuitJsonSimulationAnalysisResult | CircuitJsonSimulationParameterSweep
    >
  | SimulationAnalysisResult
  | SimulationMeasurementResult
  | SimulationParameterSweep

export type SimulationRenderableResult =
  | SimulationAnalysisResult
  | SimulationMeasurementResult

export function isSimulationAnalysisResult(
  circuitElement: Pick<CircuitJsonWithSimulation, "type">,
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

export function isSimulationMeasurementResult(
  circuitElement: Pick<CircuitJsonWithSimulation, "type">,
): circuitElement is SimulationMeasurementResult {
  return circuitElement.type === "simulation_measurement_result"
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
