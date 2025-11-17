import { expect, test } from "bun:test"
import { convertCircuitJsonToSimulationGraphSvg } from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"

const simulationExperimentId = "exp-colors-test"

const circuitJson: CircuitJsonWithSimulation[] = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: simulationExperimentId,
    name: "Test Graph and Probe Colors",
    experiment_type: "spice_transient_analysis",
  },
  // Probe with a specific color
  {
    type: "simulation_voltage_probe",
    simulation_voltage_probe_id: "sim_probe_1",
    source_component_id: "probe-1",
    name: "PROBE_BLUE",
    color: "blue",
  },
  // Graph 1: should inherit color from probe-1
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-1",
    simulation_experiment_id: simulationExperimentId,
    source_component_id: "probe-1",
    timestamps_ms: [0, 1],
    voltage_levels: [0, 1],
    name: "V(should be blue)",
  },
  // Graph 2: has its own color property
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-2",
    simulation_experiment_id: simulationExperimentId,
    source_component_id: "probe-2",
    timestamps_ms: [0, 1],
    voltage_levels: [1, 2],
    name: "V(should be green)",
    color: "green",
  },
  // Graph 3: no color, should get from palette
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-3",
    simulation_experiment_id: simulationExperimentId,
    source_component_id: "probe-3",
    timestamps_ms: [0, 1],
    voltage_levels: [2, 3],
    name: "V(should be from palette)",
  },
]

test("simulation graphs should use specified colors", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: simulationExperimentId,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
