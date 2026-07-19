import { expect, test } from "bun:test"
import { colorMap, convertCircuitJsonToSimulationGraphSvg } from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"

const simulationExperimentId = "simulation-graph-background"

const circuitJson: CircuitJsonWithSimulation[] = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: simulationExperimentId,
    name: "Simulation Graph Background",
    experiment_type: "spice_transient_analysis",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "background-graph",
    simulation_experiment_id: simulationExperimentId,
    start_time_ms: 0,
    end_time_ms: 1,
    time_per_step: 0.25,
    timestamps_ms: [0, 0.25, 0.5, 0.75, 1],
    voltage_levels: [0, 1, 2, 3, 4],
    name: "V(out)",
  },
]

test("standalone simulation graph uses the schematic background", async () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: simulationExperimentId,
    width: 600,
    height: 300,
  })

  // The visual matcher compares pixels, so the full-size background rect makes
  // an explicit root background visually equivalent. Assert the root contract too.
  expect(svg.match(/^<svg[^>]*>/)?.[0]).toContain(
    `style="background-color: ${colorMap.schematic.background}"`,
  )
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
