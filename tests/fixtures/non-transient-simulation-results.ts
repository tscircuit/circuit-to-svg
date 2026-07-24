import type {
  SimulationExperiment,
  SimulationParameterSweepCoordinate,
} from "circuit-json"
import type { CircuitJsonWithSimulation } from "lib/sim/types"

type AcSweepType = "linear" | "decade" | "octave"

const voltageSamples = [
  { re: 1, im: -0.01 },
  { re: 0.92, im: -0.16 },
  { re: 0.7, im: -0.35 },
  { re: 0.4, im: -0.4 },
  { re: 0.14, im: -0.28 },
  { re: 0.02, im: -0.09 },
]

const currentSamples = [
  { re: -0.6, im: 0.01 },
  { re: -0.54, im: 0.1 },
  { re: -0.4, im: 0.22 },
  { re: -0.23, im: 0.25 },
  { re: -0.08, im: 0.17 },
  { re: -0.01, im: 0.06 },
]

const createAcSweepCircuitJson = ({
  id,
  name,
  sweepType,
  frequencies,
}: {
  id: string
  name: string
  sweepType: AcSweepType
  frequencies: [number, ...number[]]
}): CircuitJsonWithSimulation[] => [
  {
    type: "simulation_experiment",
    simulation_experiment_id: id,
    name,
    experiment_type: "spice_ac_analysis",
    ac_sweep_type: sweepType,
    ...(sweepType === "linear"
      ? { ac_sample_count: frequencies.length }
      : { ac_samples_per_interval: 10 }),
    ac_start_frequency_hz: frequencies[0],
    ac_stop_frequency_hz: frequencies.at(-1) ?? frequencies[0],
  },
  {
    type: "simulation_ac_sweep_voltage_graph",
    simulation_ac_sweep_voltage_graph_id: `${id}_voltage_vout`,
    simulation_experiment_id: id,
    simulation_voltage_probe_id: "simulation_voltage_probe_vout",
    name: "VOUT",
    frequencies_hz: frequencies,
    complex_voltages: voltageSamples,
    color: "#315cff",
  },
  {
    type: "simulation_ac_sweep_current_graph",
    simulation_ac_sweep_current_graph_id: `${id}_current_input`,
    simulation_experiment_id: id,
    simulation_current_probe_id: "simulation_current_probe_input",
    name: "I(VIN)",
    frequencies_hz: frequencies,
    complex_currents: currentSamples,
    color: "#dc2626",
  },
]

export const dcOperatingPointCircuitJson = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: "simulation_experiment_dc_operating_point",
    name: "DC Bias Point",
    experiment_type: "spice_dc_operating_point",
  },
  {
    type: "simulation_dc_operating_point_voltage",
    simulation_dc_operating_point_voltage_id:
      "simulation_dc_operating_point_voltage_vout",
    simulation_experiment_id: "simulation_experiment_dc_operating_point",
    simulation_voltage_probe_id: "simulation_voltage_probe_vout",
    name: "VOUT",
    voltage: 3.3,
    color: "#315cff",
  },
  {
    type: "simulation_dc_operating_point_current",
    simulation_dc_operating_point_current_id:
      "simulation_dc_operating_point_current_load",
    simulation_experiment_id: "simulation_experiment_dc_operating_point",
    simulation_current_probe_id: "simulation_current_probe_load",
    name: "I(RLOAD)",
    current: 1.2,
    color: "#dc2626",
  },
] satisfies CircuitJsonWithSimulation[]

export const dcVoltageSweepCircuitJson = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: "simulation_experiment_dc_voltage_sweep",
    name: "Voltage Source Sweep",
    experiment_type: "spice_dc_sweep",
    dc_sweep_voltage_source_id: "source_component_vin",
    dc_sweep_start: 0,
    dc_sweep_stop: 5,
    dc_sweep_step: 1,
    dc_sweep_unit: "V",
  },
  {
    type: "simulation_dc_sweep_voltage_graph",
    simulation_dc_sweep_voltage_graph_id:
      "simulation_dc_voltage_sweep_graph_vout",
    simulation_experiment_id: "simulation_experiment_dc_voltage_sweep",
    simulation_voltage_probe_id: "simulation_voltage_probe_vout",
    name: "VOUT",
    sweep_values: [0, 1, 2, 3, 4, 5],
    sweep_unit: "V",
    voltage_levels: [0, 0.9, 1.8, 2.7, 3.3, 3.3],
    color: "#315cff",
  },
  {
    type: "simulation_dc_sweep_current_graph",
    simulation_dc_sweep_current_graph_id:
      "simulation_dc_voltage_sweep_graph_load",
    simulation_experiment_id: "simulation_experiment_dc_voltage_sweep",
    simulation_current_probe_id: "simulation_current_probe_load",
    name: "I(RLOAD)",
    sweep_values: [0, 1, 2, 3, 4, 5],
    sweep_unit: "V",
    current_levels: [0, 0.45, 0.9, 1.35, 1.65, 1.65],
    color: "#dc2626",
  },
] satisfies CircuitJsonWithSimulation[]

export const dcCurrentSweepCircuitJson = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: "simulation_experiment_dc_current_sweep",
    name: "Current Source Sweep",
    experiment_type: "spice_dc_sweep",
    dc_sweep_current_source_id: "source_component_iin",
    dc_sweep_start: 0,
    dc_sweep_stop: 0.01,
    dc_sweep_step: 0.002,
    dc_sweep_unit: "A",
  },
  {
    type: "simulation_dc_sweep_voltage_graph",
    simulation_dc_sweep_voltage_graph_id:
      "simulation_dc_current_sweep_graph_vout",
    simulation_experiment_id: "simulation_experiment_dc_current_sweep",
    simulation_voltage_probe_id: "simulation_voltage_probe_vout",
    name: "VOUT",
    sweep_values: [0, 0.002, 0.004, 0.006, 0.008, 0.01],
    sweep_unit: "A",
    voltage_levels: [0, 0.8, 1.6, 2.4, 3.15, 3.3],
    color: "#315cff",
  },
  {
    type: "simulation_dc_sweep_current_graph",
    simulation_dc_sweep_current_graph_id:
      "simulation_dc_current_sweep_graph_load",
    simulation_experiment_id: "simulation_experiment_dc_current_sweep",
    simulation_current_probe_id: "simulation_current_probe_load",
    name: "I(RLOAD)",
    sweep_values: [0, 0.002, 0.004, 0.006, 0.008, 0.01],
    sweep_unit: "A",
    current_levels: [0, 0.0018, 0.0036, 0.0054, 0.0071, 0.0075],
    color: "#dc2626",
  },
] satisfies CircuitJsonWithSimulation[]

export const acLinearSweepCircuitJson = createAcSweepCircuitJson({
  id: "simulation_experiment_ac_linear_sweep",
  name: "Linear Frequency Sweep",
  sweepType: "linear",
  frequencies: [100, 300, 500, 700, 900, 1_100],
})

export const acDecadeSweepCircuitJson = createAcSweepCircuitJson({
  id: "simulation_experiment_ac_decade_sweep",
  name: "Decade Frequency Sweep",
  sweepType: "decade",
  frequencies: [10, 100, 1_000, 10_000, 100_000, 1_000_000],
})

export const acOctaveSweepCircuitJson = createAcSweepCircuitJson({
  id: "simulation_experiment_ac_octave_sweep",
  name: "Octave Frequency Sweep",
  sweepType: "octave",
  frequencies: [100, 200, 400, 800, 1_600, 3_200],
})

const parameterSweepCases = [
  {
    coordinate: 100,
    transientScale: 0.5,
    operatingPointVoltage: 0.45,
    operatingPointCurrent: 0.0045,
    dcGain: 0.45,
    acScale: 0.55,
  },
  {
    coordinate: 1_000,
    transientScale: 1,
    operatingPointVoltage: 2.5,
    operatingPointCurrent: 0.0025,
    dcGain: 0.66,
    acScale: 0.8,
  },
  {
    coordinate: 10_000,
    transientScale: 1.5,
    operatingPointVoltage: 4.55,
    operatingPointCurrent: 0.000455,
    dcGain: 0.82,
    acScale: 1.05,
  },
]
const parameterSweepCoordinates = parameterSweepCases.map(
  (parameterSweepCase) => parameterSweepCase.coordinate,
)

const createParameterSweepHeader = ({
  experiment,
  sweepId,
}: {
  experiment: SimulationExperiment
  sweepId: string
}): CircuitJsonWithSimulation[] => [
  experiment,
  {
    type: "simulation_parameter_sweep",
    simulation_parameter_sweep_id: sweepId,
    simulation_experiment_id: experiment.simulation_experiment_id,
    name: "Load Resistance",
    parameter_type: "resistance",
    resistor_source_component_id: "source_component_rload",
    parameter_values: parameterSweepCoordinates,
    parameter_unit: "Ω",
  },
]

const createParameterSweepCoordinate = ({
  sweepId,
  sweepIndex,
  parameterSweepCoordinate,
}: {
  sweepId: string
  sweepIndex: number
  parameterSweepCoordinate: number
}): SimulationParameterSweepCoordinate => ({
  simulation_parameter_sweep_id: sweepId,
  sweep_index: sweepIndex,
  parameter_value: parameterSweepCoordinate,
  parameter_unit: "Ω",
})

export const parameterTransientCircuitJson = (() => {
  const experimentId = "simulation_experiment_parameter_transient"
  const sweepId = "simulation_parameter_sweep_transient"
  return [
    ...createParameterSweepHeader({
      experiment: {
        type: "simulation_experiment",
        simulation_experiment_id: experimentId,
        name: "Parameter Sweep · Transient",
        experiment_type: "spice_transient_analysis",
        start_time_ms: 0,
        end_time_ms: 4,
        time_per_step: 1,
      },
      sweepId,
    }),
    ...parameterSweepCases.flatMap((parameterSweepCase, sweepIndex) => {
      const simulationParameterSweepCoordinate = createParameterSweepCoordinate(
        {
          sweepId,
          sweepIndex,
          parameterSweepCoordinate: parameterSweepCase.coordinate,
        },
      )
      return [
        {
          type: "simulation_transient_voltage_graph",
          simulation_transient_voltage_graph_id: `${experimentId}_voltage_${sweepIndex}`,
          simulation_experiment_id: experimentId,
          simulation_parameter_sweep_coordinate:
            simulationParameterSweepCoordinate,
          name: "VOUT",
          start_time_ms: 0,
          end_time_ms: 4,
          time_per_step: 1,
          timestamps_ms: [0, 1, 2, 3, 4],
          voltage_levels: [0, 1, 2.5, 3.4, 3.3].map(
            (voltageLevel) => voltageLevel * parameterSweepCase.transientScale,
          ),
        },
        {
          type: "simulation_transient_current_graph",
          simulation_transient_current_graph_id: `${experimentId}_current_${sweepIndex}`,
          simulation_experiment_id: experimentId,
          simulation_parameter_sweep_coordinate:
            simulationParameterSweepCoordinate,
          name: "I(RLOAD)",
          start_time_ms: 0,
          end_time_ms: 4,
          time_per_step: 1,
          timestamps_ms: [0, 1, 2, 3, 4],
          current_levels: [0, 0.2, 0.5, 0.68, 0.66].map(
            (currentLevel) => currentLevel * parameterSweepCase.transientScale,
          ),
        },
      ] satisfies CircuitJsonWithSimulation[]
    }),
  ] satisfies CircuitJsonWithSimulation[]
})()

export const parameterOperatingPointCircuitJson = (() => {
  const experimentId = "simulation_experiment_parameter_operating_point"
  const sweepId = "simulation_parameter_sweep_operating_point"
  return [
    ...createParameterSweepHeader({
      experiment: {
        type: "simulation_experiment",
        simulation_experiment_id: experimentId,
        name: "Parameter Sweep · DC Operating Point",
        experiment_type: "spice_dc_operating_point",
      },
      sweepId,
    }),
    ...parameterSweepCases.flatMap((parameterSweepCase, sweepIndex) => {
      const simulationParameterSweepCoordinate = createParameterSweepCoordinate(
        {
          sweepId,
          sweepIndex,
          parameterSweepCoordinate: parameterSweepCase.coordinate,
        },
      )
      return [
        {
          type: "simulation_dc_operating_point_voltage",
          simulation_dc_operating_point_voltage_id: `${experimentId}_voltage_${sweepIndex}`,
          simulation_experiment_id: experimentId,
          simulation_parameter_sweep_coordinate:
            simulationParameterSweepCoordinate,
          simulation_voltage_probe_id: "simulation_voltage_probe_vout",
          name: "VOUT",
          voltage: parameterSweepCase.operatingPointVoltage,
        },
        {
          type: "simulation_dc_operating_point_current",
          simulation_dc_operating_point_current_id: `${experimentId}_current_${sweepIndex}`,
          simulation_experiment_id: experimentId,
          simulation_parameter_sweep_coordinate:
            simulationParameterSweepCoordinate,
          simulation_current_probe_id: "simulation_current_probe_load",
          name: "I(RLOAD)",
          current: parameterSweepCase.operatingPointCurrent,
        },
      ] satisfies CircuitJsonWithSimulation[]
    }),
  ] satisfies CircuitJsonWithSimulation[]
})()

export const parameterDcSweepCircuitJson = (() => {
  const experimentId = "simulation_experiment_parameter_dc_sweep"
  const sweepId = "simulation_parameter_sweep_dc_sweep"
  const sweepValues = [0, 1, 2, 3, 4, 5]
  return [
    ...createParameterSweepHeader({
      experiment: {
        type: "simulation_experiment",
        simulation_experiment_id: experimentId,
        name: "Parameter Sweep · DC Sweep",
        experiment_type: "spice_dc_sweep",
        dc_sweep_voltage_source_id: "source_component_vin",
        dc_sweep_start: 0,
        dc_sweep_stop: 5,
        dc_sweep_step: 1,
        dc_sweep_unit: "V",
      },
      sweepId,
    }),
    ...parameterSweepCases.flatMap((parameterSweepCase, sweepIndex) => {
      const simulationParameterSweepCoordinate = createParameterSweepCoordinate(
        {
          sweepId,
          sweepIndex,
          parameterSweepCoordinate: parameterSweepCase.coordinate,
        },
      )
      return [
        {
          type: "simulation_dc_sweep_voltage_graph",
          simulation_dc_sweep_voltage_graph_id: `${experimentId}_voltage_${sweepIndex}`,
          simulation_experiment_id: experimentId,
          simulation_parameter_sweep_coordinate:
            simulationParameterSweepCoordinate,
          simulation_voltage_probe_id: "simulation_voltage_probe_vout",
          name: "VOUT",
          sweep_values: sweepValues,
          sweep_unit: "V",
          voltage_levels: sweepValues.map(
            (sweepCoordinate) => sweepCoordinate * parameterSweepCase.dcGain,
          ),
        },
        {
          type: "simulation_dc_sweep_current_graph",
          simulation_dc_sweep_current_graph_id: `${experimentId}_current_${sweepIndex}`,
          simulation_experiment_id: experimentId,
          simulation_parameter_sweep_coordinate:
            simulationParameterSweepCoordinate,
          simulation_current_probe_id: "simulation_current_probe_load",
          name: "I(RLOAD)",
          sweep_values: sweepValues,
          sweep_unit: "V",
          current_levels: sweepValues.map(
            (sweepCoordinate) =>
              (sweepCoordinate * parameterSweepCase.dcGain) /
              parameterSweepCase.coordinate,
          ),
        },
      ] satisfies CircuitJsonWithSimulation[]
    }),
  ] satisfies CircuitJsonWithSimulation[]
})()

export const parameterAcSweepCircuitJson = (() => {
  const experimentId = "simulation_experiment_parameter_ac_sweep"
  const sweepId = "simulation_parameter_sweep_ac_sweep"
  const frequencies: [number, ...number[]] = [
    10, 100, 1_000, 10_000, 100_000, 1_000_000,
  ]
  return [
    ...createParameterSweepHeader({
      experiment: {
        type: "simulation_experiment",
        simulation_experiment_id: experimentId,
        name: "Parameter Sweep · AC Sweep",
        experiment_type: "spice_ac_analysis",
        ac_sweep_type: "decade",
        ac_samples_per_interval: 10,
        ac_start_frequency_hz: frequencies[0],
        ac_stop_frequency_hz: frequencies.at(-1) ?? frequencies[0],
      },
      sweepId,
    }),
    ...parameterSweepCases.flatMap((parameterSweepCase, sweepIndex) => {
      const simulationParameterSweepCoordinate = createParameterSweepCoordinate(
        {
          sweepId,
          sweepIndex,
          parameterSweepCoordinate: parameterSweepCase.coordinate,
        },
      )
      return [
        {
          type: "simulation_ac_sweep_voltage_graph",
          simulation_ac_sweep_voltage_graph_id: `${experimentId}_voltage_${sweepIndex}`,
          simulation_experiment_id: experimentId,
          simulation_parameter_sweep_coordinate:
            simulationParameterSweepCoordinate,
          simulation_voltage_probe_id: "simulation_voltage_probe_vout",
          name: "VOUT",
          frequencies_hz: frequencies,
          complex_voltages: voltageSamples.map(({ re, im }) => ({
            re: re * parameterSweepCase.acScale,
            im: im * parameterSweepCase.acScale,
          })),
        },
        {
          type: "simulation_ac_sweep_current_graph",
          simulation_ac_sweep_current_graph_id: `${experimentId}_current_${sweepIndex}`,
          simulation_experiment_id: experimentId,
          simulation_parameter_sweep_coordinate:
            simulationParameterSweepCoordinate,
          simulation_current_probe_id: "simulation_current_probe_input",
          name: "I(VIN)",
          frequencies_hz: frequencies,
          complex_currents: currentSamples.map(({ re, im }) => ({
            re: re * parameterSweepCase.acScale,
            im: im * parameterSweepCase.acScale,
          })),
        },
      ] satisfies CircuitJsonWithSimulation[]
    }),
  ] satisfies CircuitJsonWithSimulation[]
})()
