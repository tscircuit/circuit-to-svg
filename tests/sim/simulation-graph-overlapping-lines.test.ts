import { expect, test } from "bun:test"
import { convertCircuitJsonToSimulationGraphSvg } from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"

const experimentId = "exp-overlap"

const circuitJson: CircuitJsonWithSimulation[] = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: experimentId,
    name: "Overlapping Lines",
    experiment_type: "transient",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-a",
    simulation_experiment_id: experimentId,
    schematic_voltage_probe_id: "probe-a",
    start_time_ms: 0,
    end_time_ms: 3,
    time_per_step: 1,
    timestamps_ms: [0, 1, 2, 3],
    voltage_levels: [1, 1, 2, 2],
    name: "V(a)",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-b",
    simulation_experiment_id: experimentId,
    schematic_voltage_probe_id: "probe-b",
    start_time_ms: 0,
    end_time_ms: 3,
    time_per_step: 1,
    timestamps_ms: [0, 1, 2, 3],
    voltage_levels: [1, 1, 1, 1],
    name: "V(b)",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-c",
    simulation_experiment_id: experimentId,
    schematic_voltage_probe_id: "probe-c",
    start_time_ms: 0,
    end_time_ms: 3,
    time_per_step: 1,
    timestamps_ms: [0, 1, 2, 3],
    voltage_levels: [1, 1, 0, 0],
    name: "V(c)",
  },
]

test("renders layered dashed voltage lines for overlapping paths", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: experimentId,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
