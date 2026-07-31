import type { CircuitJsonWithSimulation } from "lib/sim/types"

export const multidimensionalMeasurementCircuitJson = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: "simulation_experiment_efficiency",
    name: "TPS63802 Efficiency",
    experiment_type: "spice_transient_analysis",
    start_time_ms: 0,
    end_time_ms: 1,
    time_per_step: 0.01,
  },
  {
    type: "simulation_parameter_sweep",
    simulation_parameter_sweep_id: "simulation_parameter_sweep_vin",
    simulation_experiment_id: "simulation_experiment_efficiency",
    name: "Output Voltage",
    parameter_type: "resistance",
    resistor_source_component_id: "source_component_feedback",
    parameter_values: [236_600, 511_000, 855_400],
    parameter_unit: "Ω",
    display_parameter_values: [1.8, 3.3, 5.2],
    display_parameter_unit: "V",
  },
  {
    type: "simulation_parameter_sweep",
    simulation_parameter_sweep_id: "simulation_parameter_sweep_load",
    simulation_experiment_id: "simulation_experiment_efficiency",
    name: "Load Current",
    parameter_type: "current",
    current_source_component_id: "source_component_iload",
    parameter_values: [0.001, 0.01, 0.1, 1],
    parameter_unit: "A",
  },
  {
    type: "simulation_measurement_result",
    simulation_measurement_result_id:
      "simulation_measurement_result_efficiency",
    simulation_experiment_id: "simulation_experiment_efficiency",
    name: "Efficiency",
    measurement_values: [72, 88, 94, 91, 76, 91, 96, 94, 78, 92, 95, 92],
    measurement_unit: "%",
    simulation_parameter_sweep_coordinate_sets: [
      236_600, 511_000, 855_400,
    ].flatMap((feedbackResistance, inputVoltageIndex) =>
      [0.001, 0.01, 0.1, 1].map((loadCurrent, loadCurrentIndex) => [
        {
          simulation_parameter_sweep_id: "simulation_parameter_sweep_vin",
          sweep_index: inputVoltageIndex,
          parameter_value: feedbackResistance,
          parameter_unit: "Ω" as const,
        },
        {
          simulation_parameter_sweep_id: "simulation_parameter_sweep_load",
          sweep_index: loadCurrentIndex,
          parameter_value: loadCurrent,
          parameter_unit: "A" as const,
        },
      ]),
    ),
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id:
      "simulation_transient_voltage_graph_raw_efficiency_run",
    simulation_experiment_id: "simulation_experiment_efficiency",
    name: "Raw VOUT",
    timestamps_ms: [0, 0.5, 1],
    voltage_levels: [0, 3.2, 3.3],
    start_time_ms: 0,
    end_time_ms: 1,
    time_per_step: 0.5,
  },
] satisfies CircuitJsonWithSimulation[]

export const oneDimensionalMeasurementCircuitJson = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: "simulation_experiment_frequency",
    name: "TPS63802 Burst Frequency",
    experiment_type: "spice_transient_analysis",
    start_time_ms: 0,
    end_time_ms: 1,
    time_per_step: 0.01,
  },
  {
    type: "simulation_parameter_sweep",
    simulation_parameter_sweep_id: "simulation_parameter_sweep_load_current",
    simulation_experiment_id: "simulation_experiment_frequency",
    name: "Output Current",
    parameter_type: "current",
    current_source_component_id: "source_component_iload",
    parameter_values: [0.0001, 0.001, 0.01, 0.1],
    parameter_unit: "A",
  },
  {
    type: "simulation_measurement_result",
    simulation_measurement_result_id: "simulation_measurement_result_frequency",
    simulation_experiment_id: "simulation_experiment_frequency",
    name: "Burst Frequency",
    measurement_values: [1_200, 8_000, 65_000, 620_000],
    measurement_unit: "Hz",
    simulation_parameter_sweep_coordinate_sets: [0.0001, 0.001, 0.01, 0.1].map(
      (loadCurrent, sweepIndex) => [
        {
          simulation_parameter_sweep_id:
            "simulation_parameter_sweep_load_current",
          sweep_index: sweepIndex,
          parameter_value: loadCurrent,
          parameter_unit: "A" as const,
        },
      ],
    ),
  },
] satisfies CircuitJsonWithSimulation[]

export const multidimensionalTransientCircuitJson = [
  {
    type: "simulation_experiment",
    simulation_experiment_id:
      "simulation_experiment_multidimensional_transient",
    name: "Multidimensional Transient Sweep",
    experiment_type: "spice_transient_analysis",
    start_time_ms: 0,
    end_time_ms: 3,
    time_per_step: 1,
  },
  ...[
    { resistance: 100, capacitance: 1e-6, scale: 0.8 },
    { resistance: 100, capacitance: 2e-6, scale: 0.9 },
    { resistance: 200, capacitance: 1e-6, scale: 1 },
    { resistance: 200, capacitance: 2e-6, scale: 1.1 },
  ].map(({ resistance, capacitance, scale }, resultIndex) => ({
    type: "simulation_transient_voltage_graph" as const,
    simulation_transient_voltage_graph_id: `simulation_transient_voltage_graph_${resultIndex}`,
    simulation_experiment_id:
      "simulation_experiment_multidimensional_transient",
    simulation_parameter_sweep_coordinates: [
      {
        simulation_parameter_sweep_id: "simulation_parameter_sweep_resistance",
        sweep_index: resistance === 100 ? 0 : 1,
        parameter_value: resistance,
        parameter_unit: "Ω" as const,
      },
      {
        simulation_parameter_sweep_id: "simulation_parameter_sweep_capacitance",
        sweep_index: capacitance === 1e-6 ? 0 : 1,
        parameter_value: capacitance,
        parameter_unit: "F" as const,
      },
    ],
    name: "VOUT",
    timestamps_ms: [0, 1, 2, 3],
    voltage_levels: [0, 2, 3.2, 3.3].map((value) => value * scale),
    time_per_step: 1,
    start_time_ms: 0,
    end_time_ms: 3,
  })),
] satisfies CircuitJsonWithSimulation[]
