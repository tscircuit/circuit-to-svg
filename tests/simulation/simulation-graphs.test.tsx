import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  SimulationExperiment,
  SimulationTransientVoltageGraph,
} from "circuit-json"
import {
  convertCircuitJsonToSimulationGraphSvg,
  convertCircuitJsonToSchematicAndSimulationGraphSvg,
} from "lib/index"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

const createTransientGraph = ({
  id,
  experimentId,
  name,
  startTime,
  timePerStep,
  values,
  includeTimestamps = true,
  schematicVoltageProbeId,
}: {
  id: string
  experimentId: string
  name: string
  startTime: number
  timePerStep: number
  values: number[]
  includeTimestamps?: boolean
  schematicVoltageProbeId?: string
}): SimulationTransientVoltageGraph => {
  const timestamps = values.map((_, index) => startTime + timePerStep * index)
  const endTime = timestamps[timestamps.length - 1] ?? startTime

  return {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: id,
    simulation_experiment_id: experimentId,
    start_time_ms: startTime,
    end_time_ms: endTime,
    time_per_step: timePerStep,
    voltage_levels: values,
    ...(includeTimestamps ? { timestamps_ms: timestamps } : {}),
    ...(schematicVoltageProbeId
      ? { schematic_voltage_probe_id: schematicVoltageProbeId }
      : {}),
    name,
  }
}

test("convertCircuitJsonToSimulationGraphSvg renders stacked graphs", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="12mm" height="8mm" routingDisabled>
      <resistor
        name="R1"
        resistance="1k"
        footprint="0402"
        symbolName="boxresistor_right"
      />
      <capacitor name="C1" capacitance="10uF" footprint="0402" />
      <trace from=".R1 .pin2" to=".C1 .pin1" />
    </board>,
  )

  await circuit.renderUntilSettled()

  const baseCircuitJson = circuit.getCircuitJson() as AnyCircuitElement[]

  const simulationExperiment: SimulationExperiment = {
    type: "simulation_experiment",
    simulation_experiment_id: "simulation_experiment_transient",
    name: "Transient Response",
    experiment_type: "spice_transient_analysis",
  }

  const graphA = createTransientGraph({
    id: "transient_graph_probe_a",
    experimentId: simulationExperiment.simulation_experiment_id,
    name: "Probe A",
    startTime: 0,
    timePerStep: 0.5,
    schematicVoltageProbeId: "schematic_voltage_probe_a",
    values: Array.from({ length: 21 }, (_, index) =>
      Number((5 * Math.exp(-index * 0.12) * Math.sin(index * 0.45)).toFixed(3)),
    ),
  })

  const graphB = createTransientGraph({
    id: "transient_graph_probe_b",
    experimentId: simulationExperiment.simulation_experiment_id,
    name: "Probe B",
    startTime: 0,
    timePerStep: 0.5,
    includeTimestamps: false,
    values: Array.from({ length: 21 }, (_, index) =>
      Number(
        (
          2.5 +
          0.8 * Math.sin(index * 0.4) +
          0.3 * Math.cos(index * 0.9)
        ).toFixed(3),
      ),
    ),
  })

  const graphC = createTransientGraph({
    id: "transient_graph_probe_c",
    experimentId: simulationExperiment.simulation_experiment_id,
    name: "Probe C",
    startTime: 0,
    timePerStep: 0.5,
    values: Array.from({ length: 21 }, (_, index) =>
      Number((3 + 1.2 * Math.exp(-index * 0.15)).toFixed(3)),
    ),
  })

  const circuitJson: AnyCircuitElement[] = [
    ...baseCircuitJson,
    simulationExperiment,
    graphA,
    graphB,
    graphC,
  ]

  expect(
    convertCircuitJsonToSimulationGraphSvg({
      circuitJson,
      simulation_experiment_id: simulationExperiment.simulation_experiment_id,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})

test("convertCircuitJsonToSchematicAndSimulationGraphSvg with simulation below schematic", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="16mm" height="10mm" routingDisabled>
      <resistor
        name="R1"
        resistance="1k"
        footprint="0402"
        symbolName="boxresistor_right"
      />
      <capacitor name="C1" capacitance="10uF" footprint="0402" />
      <inductor name="L1" inductance="2mH" footprint="0603" />
      <trace from=".R1 .pin2" to=".C1 .pin1" />
      <trace from=".C1 .pin2" to=".L1 .pin1" />
    </board>,
  )

  await circuit.renderUntilSettled()

  const baseCircuitJson = circuit.getCircuitJson() as AnyCircuitElement[]

  const simulationExperiment: SimulationExperiment = {
    type: "simulation_experiment",
    simulation_experiment_id: "simulation_experiment_combo",
    name: "Combined View",
    experiment_type: "spice_transient_analysis",
  }

  const graph = createTransientGraph({
    id: "combined_graph",
    experimentId: simulationExperiment.simulation_experiment_id,
    name: "Output",
    startTime: 0,
    timePerStep: 0.25,
    schematicVoltageProbeId: "schematic_voltage_probe_output",
    values: Array.from({ length: 25 }, (_, index) =>
      Number(
        (4.5 * Math.exp(-index * 0.09) * Math.sin(index * 0.6)).toFixed(3),
      ),
    ),
  })

  const circuitJson: AnyCircuitElement[] = [
    ...baseCircuitJson,
    simulationExperiment,
    graph,
  ]

  expect(
    convertCircuitJsonToSchematicAndSimulationGraphSvg({
      circuitJson,
      simulation_experiment_id: simulationExperiment.simulation_experiment_id,
      orientation: "simulation_on_bottom",
    }),
  ).toMatchSvgSnapshot(`${import.meta.path} - combined-bottom`)

  expect(
    convertCircuitJsonToSchematicAndSimulationGraphSvg({
      circuitJson,
      simulation_experiment_id: simulationExperiment.simulation_experiment_id,
      orientation: "simulation_on_right",
    }),
  ).toMatchSvgSnapshot(`${import.meta.path} - combined-right`)
})
