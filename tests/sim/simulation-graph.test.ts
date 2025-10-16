import { expect, test } from "bun:test"
import { convertCircuitJsonToSimulationGraphSvg } from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"

const simulationExperimentId = "exp-1"

const circuitJson: CircuitJsonWithSimulation[] = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: simulationExperimentId,
    name: "Transient Voltage Sweep",
    experiment_type: "spice_transient_analysis",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-1",
    simulation_experiment_id: simulationExperimentId,
    schematic_voltage_probe_id: "vp-1",
    subcircuit_connectivity_map_key: "net-1",
    start_time_ms: 0,
    end_time_ms: 10,
    time_per_step: 2,
    timestamps_ms: [0, 2, 4, 6, 8, 10],
    voltage_levels: [0, 1.5, 3, 2, 1, 0.5],
    name: "V(out)",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-2",
    simulation_experiment_id: simulationExperimentId,
    schematic_voltage_probe_id: "vp-2",
    start_time_ms: 0,
    end_time_ms: 10,
    time_per_step: 1,
    voltage_levels: [0, -0.5, 0.25, 1.25, 0.5, -0.25, 0.75, 1.1, 0.9, 0.5, 0.2],
    name: "V(in)",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-3",
    simulation_experiment_id: simulationExperimentId,
    start_time_ms: 0,
    end_time_ms: 10,
    time_per_step: 5,
    voltage_levels: [3, 3, 3],
    name: "V(ref)",
  },
]

test("renders all transient voltage graphs", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: simulationExperimentId,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("filters by simulation_transient_voltage_graph_ids", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: simulationExperimentId,
    simulation_transient_voltage_graph_ids: ["graph-1", "graph-3"],
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path, "filtered")
})

test("uses voltage probe name as label fallback", () => {
  const circuitWithProbe: CircuitJsonWithSimulation[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "exp-probe-test",
      name: "Test with Voltage Probe",
      experiment_type: "spice_transient_analysis",
    },
    {
      type: "simulation_voltage_probe",
      simulation_voltage_probe_id: "simulation_voltage_probe_0",
      name: "V_PROBE_1",
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-1",
      simulation_experiment_id: "exp-probe-test",
      schematic_voltage_probe_id: "probe-1",
      simulation_voltage_probe_id: "simulation_voltage_probe_0",
      start_time_ms: 0,
      end_time_ms: 5,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4, 5],
      voltage_levels: [0, 1.2, 2, 2.3, 1.8, 0.5],
      name: "V(graph_label_should_be_overridden_by_probe_name)",
      // Both graph and probe have names; should prefer probe name
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-2",
      simulation_experiment_id: "exp-probe-test",
      schematic_voltage_probe_id: "probe-does-not-exist",
      start_time_ms: 0,
      end_time_ms: 5,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4, 5],
      voltage_levels: [3, 2.8, 2, 1.3, 0.8, 0.2],
      name: "V(signal_2)", // name property should take precedence
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-3",
      simulation_experiment_id: "exp-probe-test",
      schematic_voltage_probe_id: "probe-2",
      start_time_ms: 0,
      end_time_ms: 5,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4, 5],
      voltage_levels: [1, 1, 1, 1, 1, 1],
    },
  ]

  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: circuitWithProbe,
    simulation_experiment_id: "exp-probe-test",
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path, "with-probe-names")
})
