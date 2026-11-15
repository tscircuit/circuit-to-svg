import { expect, test } from "bun:test"
import type {
  SimulationAnalysisResult,
  SimulationExperiment,
} from "circuit-json"
import { normalizeSimulationAnalysisResults } from "lib/sim/normalize-simulation-analysis-results"

test("normalizeSimulationAnalysisResults filters non-positive frequencies in logarithmic AC sweeps and preserves finite step metadata", () => {
  const experiment: SimulationExperiment = {
    type: "simulation_experiment",
    simulation_experiment_id: "exp_ac_zero",
    name: "AC Sweep with DC sample",
    experiment_type: "spice_ac_analysis",
    ac_sweep_type: "decade",
  }
  const results: SimulationAnalysisResult[] = [
    {
      type: "simulation_ac_sweep_voltage_graph",
      simulation_ac_sweep_voltage_graph_id: "ac_vout",
      simulation_experiment_id: "exp_ac_zero",
      simulation_voltage_probe_id: "vp_ac",
      frequencies_hz: [0, 10, 100, 1000],
      complex_voltages: [
        { re: 1, im: 0 },
        { re: 0.9, im: -0.1 },
        { re: 0.5, im: -0.5 },
        { re: 0.1, im: -0.3 },
      ],
    },
  ]

  const normalized = normalizeSimulationAnalysisResults({
    experiment,
    acSweepView: "magnitude",
    results,
  })

  expect(normalized.usesLogarithmicXValues).toBe(true)
  expect(normalized.xAxisTitle).toBe("Frequency (Hz)")
  expect(normalized.graphs).toHaveLength(1)
  const graph = normalized.graphs[0]!
  expect(graph.timestamps_ms).toEqual([1, 2, 3])
  expect(Number.isFinite(graph.start_time_ms)).toBe(true)
  expect(Number.isFinite(graph.time_per_step)).toBe(true)
  expect(
    graph.type === "simulation_transient_voltage_graph"
      ? graph.voltage_levels
      : [],
  ).toHaveLength(3)
})

test("normalizeSimulationAnalysisResults prefers waveform results when an experiment also emits DC operating point scalars", () => {
  const experiment: SimulationExperiment = {
    type: "simulation_experiment",
    simulation_experiment_id: "exp_mixed",
    name: "Transient with OP",
    experiment_type: "spice_transient_analysis",
  }
  const results: SimulationAnalysisResult[] = [
    {
      type: "simulation_dc_operating_point_voltage",
      simulation_dc_operating_point_voltage_id: "op_vout",
      simulation_experiment_id: "exp_mixed",
      simulation_voltage_probe_id: "vp_mixed",
      voltage: 3.3,
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "tr_vout",
      simulation_experiment_id: "exp_mixed",
      start_time_ms: 0,
      end_time_ms: 2,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2],
      voltage_levels: [0, 1.65, 3.3],
    },
  ]

  const normalizedMixed = normalizeSimulationAnalysisResults({
    experiment,
    acSweepView: "magnitude",
    results,
  })
  expect(normalizedMixed.xAxisTitle).toBe("Time (ms)")
  expect(normalizedMixed.graphs).toHaveLength(1)
  expect(normalizedMixed.graphs[0]?.type).toBe(
    "simulation_transient_voltage_graph",
  )
  expect(normalizedMixed.graphs[0]?.timestamps_ms).toEqual([0, 1, 2])
})
