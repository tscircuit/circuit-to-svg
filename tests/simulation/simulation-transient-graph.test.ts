import { expect, test } from "bun:test"
import { convertCircuitJsonToSimulationGraphSvg } from "lib/index"

type ExperimentType = "transient"

test("render multi-line transient simulation graph", () => {
  const circuitJson = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "exp-1",
      name: "Transient Analysis",
      experiment_type: "transient" satisfies ExperimentType,
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-1",
      simulation_experiment_id: "exp-1",
      start_time_ms: 0,
      end_time_ms: 5,
      time_per_step: 0.5,
      voltage_levels: [0, 1.2, 2.4, 1.8, 1.2, 0.5, 0.1, 0],
      timestamps_ms: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
      schematic_voltage_probe_id: "V(out)",
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-2",
      simulation_experiment_id: "exp-1",
      start_time_ms: 0,
      end_time_ms: 5,
      time_per_step: 0.5,
      voltage_levels: [5, 4.5, 4.2, 3.8, 3.5, 3.2, 3.0, 2.8],
      schematic_voltage_probe_id: "V(in)",
    },
  ] as any

  const svg = convertCircuitJsonToSimulationGraphSvg({
    simulation_experiment_id: "exp-1",
    circuitJson,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("render subset of graphs when explicit ids provided", () => {
  const circuitJson = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "exp-2",
      name: "Filter Response",
      experiment_type: "transient" satisfies ExperimentType,
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-a",
      simulation_experiment_id: "exp-2",
      start_time_ms: 0,
      end_time_ms: 10,
      time_per_step: 1,
      voltage_levels: [0, 0.5, 1.4, 2.1, 2.5, 2.6, 2.7, 2.8, 2.85, 2.9, 2.92],
      name: "Output",
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-b",
      simulation_experiment_id: "exp-2",
      start_time_ms: 0,
      end_time_ms: 10,
      time_per_step: 1,
      voltage_levels: [3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3],
      name: "Reference",
    },
  ] as any

  const svg = convertCircuitJsonToSimulationGraphSvg({
    simulation_experiment_id: "exp-2",
    circuitJson,
    simulation_transient_voltage_graph_ids: ["graph-a"],
  })

  expect(svg).toMatchSvgSnapshot(`${import.meta.path} - filtered`)
})
