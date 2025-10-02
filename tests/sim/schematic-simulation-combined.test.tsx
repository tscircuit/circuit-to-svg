import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSimulationSvg } from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"
import { parseSync } from "svgson"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("renders schematic above simulation graph", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <resistor
        name="R1"
        resistance="10"
        footprint="0402"
        symbolName="boxresistor_right"
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  const baseCircuit = circuit.getCircuitJson()
  const simulationExperimentId = "exp-1"

  const circuitJsonWithSimulation: CircuitJsonWithSimulation[] = [
    ...baseCircuit,
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
      start_time_ms: 0,
      end_time_ms: 5,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4, 5],
      voltage_levels: [0, 1.2, 2, 2.3, 1.8, 0.5],
      name: "V(out)",
    },
  ]

  const svg = convertCircuitJsonToSchematicSimulationSvg({
    circuitJson: circuitJsonWithSimulation,
    simulation_experiment_id: simulationExperimentId,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("applies custom schematic height ratio", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <resistor
        name="R1"
        resistance="10"
        footprint="0402"
        symbolName="boxresistor_right"
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  const baseCircuit = circuit.getCircuitJson()
  const simulationExperimentId = "exp-1"

  const circuitJsonWithSimulation: CircuitJsonWithSimulation[] = [
    ...baseCircuit,
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
      start_time_ms: 0,
      end_time_ms: 5,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4, 5],
      voltage_levels: [0, 1.2, 2, 2.3, 1.8, 0.5],
      name: "V(out)",
    },
  ]

  const totalHeight = 900
  const schematicHeightRatio = 0.7

  const svg = convertCircuitJsonToSchematicSimulationSvg({
    circuitJson: circuitJsonWithSimulation,
    simulation_experiment_id: simulationExperimentId,
    height: totalHeight,
    schematicHeightRatio,
  })

  const parsed = parseSync(svg)
  const children = (parsed.children ?? []).filter(
    (child) => child.type === "element",
  )
  const schematicSvg = children[0]
  const simulationSvg = children[1]

  expect(parsed.attributes.height).toBe(String(totalHeight))
  expect(schematicSvg?.attributes?.y).toBe("0")
  expect(simulationSvg?.attributes?.y).toBe("630")
})
