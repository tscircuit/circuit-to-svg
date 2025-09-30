import { expect, test } from "bun:test"
import { convertCircuitJsonToSimulationGraphSvg } from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"

const simulationExperimentId = "exp-1"

const circuitJson: CircuitJsonWithSimulation[] = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: simulationExperimentId,
    name: "Transient Voltage Sweep",
    experiment_type: "transient",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-1",
    simulation_experiment_id: simulationExperimentId,
    schematic_voltage_probe_id: "vp-1",
    subcircuit_connecivity_map_key: "net-1",
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
