import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToSchematicAndSimulationGraphSvg,
  convertCircuitJsonToSimulationGraphSvg,
} from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

const SIMULATION_EXPERIMENT_ID = "simulation_experiment_transient"

function createSimulationElements(): AnyCircuitElement[] {
  const elements = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: SIMULATION_EXPERIMENT_ID,
      name: "Transient Response",
      experiment_type: "transient" as const,
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph_vout",
      simulation_experiment_id: SIMULATION_EXPERIMENT_ID,
      timestamps_ms: [0, 0.2, 0.4, 0.6, 0.9, 1.2],
      voltage_levels: [0, 1.6, 3.1, 2.8, 2.4, 2.0],
      schematic_voltage_probe_id: "schematic_voltage_probe_vout",
      time_per_step: 0.2,
      start_time_ms: 0,
      end_time_ms: 1.2,
      name: "V(out)",
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph_vin",
      simulation_experiment_id: SIMULATION_EXPERIMENT_ID,
      voltage_levels: [0, 2.5, 5, 2.5, 0, -0.5],
      time_per_step: 0.2,
      start_time_ms: 0,
      end_time_ms: 1.0,
      name: "V(in)",
    },
  ]

  return elements.map((element) => element as unknown as AnyCircuitElement)
}

test("render simulation experiment voltage graphs", () => {
  const circuitJson = createSimulationElements()

  expect(
    convertCircuitJsonToSimulationGraphSvg({
      circuitJson,
      simulation_experiment_id: SIMULATION_EXPERIMENT_ID,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})

test("stack schematic and simulation graph output", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="12mm" height="10mm" routingDisabled>
      <resistor
        name="R1"
        resistance="220"
        footprint="0402"
        symbolName="boxresistor_right"
      />
      <capacitor
        name="C1"
        capacitance="1uF"
        footprint="0402"
        symbolName="capacitor"
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  const simulationElements = createSimulationElements()
  const circuitJson = [
    ...circuit.getCircuitJson(),
    ...simulationElements,
  ] as AnyCircuitElement[]

  expect(
    convertCircuitJsonToSchematicAndSimulationGraphSvg({
      circuitJson,
      simulation_experiment_id: SIMULATION_EXPERIMENT_ID,
      orientation: "simulation_on_bottom",
    }),
  ).toMatchSvgSnapshot(import.meta.path + "-stacked")
})
