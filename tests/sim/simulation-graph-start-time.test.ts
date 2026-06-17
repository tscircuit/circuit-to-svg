import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSimulationGraphSvg } from "lib"

test("simulation graph uses exact transient start and end time domain", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "exp_start_time",
      name: "Start Time Repro",
      experiment_type: "spice_transient_analysis",
      start_time_ms: 0.69758,
      end_time_ms: 0.71556,
      time_per_step: 0.000005,
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph_vout",
      simulation_experiment_id: "exp_start_time",
      name: "VOUT",
      start_time_ms: 0.69758,
      end_time_ms: 0.71556,
      time_per_step: 0.000005,
      timestamps_ms: [0.69758, 0.702075, 0.70657, 0.711065, 0.71556],
      voltage_levels: [4.2, 4.2, 4.2, 4.2, 4.2],
    },
  ]

  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: "exp_start_time",
    width: 1200,
    height: 540,
  })

  expect(svg).toContain("0.69758")
  expect(svg).toContain("0.71556")

  // The axis domain should not be expanded to nicified labels.
  expect(svg).not.toContain(">0.695<")
  expect(svg).not.toContain(">0.72<")

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
