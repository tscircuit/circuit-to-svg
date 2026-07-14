import { expect, test } from "bun:test"
import { createElement } from "react"
import {
  convertCircuitJsonToOperatingPointSvg,
  convertCircuitJsonToSchematicSimulationSvg,
} from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

const simulationExperimentId = "simulation_experiment_bias"

const operatingPointResults: CircuitJsonWithSimulation[] = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: simulationExperimentId,
    name: "Buck converter bias point",
    experiment_type: "spice_dc_operating_point",
    timeout_ms: 5000,
  },
  {
    type: "simulation_operating_point_voltage",
    simulation_operating_point_voltage_id: "simulation_op_voltage_vin",
    simulation_experiment_id: simulationExperimentId,
    simulation_voltage_probe_id: "simulation_voltage_probe_vin",
    voltage: 5,
    name: "VIN",
    source_node_name: "VIN",
    reference_node_name: "0",
    color: "#2563eb",
  },
  {
    type: "simulation_operating_point_voltage",
    simulation_operating_point_voltage_id: "simulation_op_voltage_vout",
    simulation_experiment_id: simulationExperimentId,
    simulation_voltage_probe_id: "simulation_voltage_probe_vout",
    voltage: 2.5,
    name: "VOUT",
    source_node_name: "VOUT",
    reference_node_name: "0",
    color: "#16a34a",
  },
  {
    type: "simulation_operating_point_current",
    simulation_operating_point_current_id: "simulation_op_current_load",
    simulation_experiment_id: simulationExperimentId,
    simulation_current_probe_id: "simulation_current_probe_load",
    current: 0.0025,
    name: "I_LOAD",
    source_component_id: "source_component_R1",
    color: "#ea580c",
  },
]

test("renders operating-point scalar measurements", () => {
  const svg = convertCircuitJsonToOperatingPointSvg({
    circuitJson: operatingPointResults,
    simulation_experiment_id: simulationExperimentId,
  })

  expect(svg).toContain("DC operating-point results")
  expect(svg).toContain("2.5 mA")
  expect(svg).toMatchSvgSnapshot(import.meta.path, "results-table")
})

test("combines an operating-point table with the schematic", async () => {
  const { circuit } = getTestFixture()
  circuit.add(
    createElement(
      "board",
      { width: "20mm", height: "12mm", routingDisabled: true },
      createElement("resistor", {
        name: "R1",
        resistance: "1k",
        footprint: "0402",
        symbolName: "boxresistor_right",
      }),
      createElement("resistor", {
        name: "R2",
        resistance: "1k",
        footprint: "0402",
        symbolName: "boxresistor_right",
      }),
    ),
  )
  await circuit.renderUntilSettled()

  const svg = convertCircuitJsonToSchematicSimulationSvg({
    circuitJson: [
      ...(circuit.getCircuitJson() as CircuitJsonWithSimulation[]),
      ...operatingPointResults,
    ],
    simulation_experiment_id: simulationExperimentId,
  })

  expect(svg).toContain('data-simulation-view="operating-point"')
  expect(svg).toMatchSvgSnapshot(import.meta.path, "schematic-and-results")
})

test("renders actionable non-convergence diagnostics", () => {
  const circuitJson: CircuitJsonWithSimulation[] = [
    operatingPointResults[0]!,
    {
      type: "simulation_experiment_error",
      simulation_experiment_error_id: "simulation_experiment_error_0",
      error_type: "simulation_experiment_error",
      simulation_experiment_id: simulationExperimentId,
      error_code: "non_convergent",
      message:
        "ngspice could not find a stable DC operating point after source stepping",
      diagnostics: ["doAnalyses: OP: Timestep too small"],
      is_fatal: true,
    },
  ]

  const svg = convertCircuitJsonToOperatingPointSvg({
    circuitJson,
    simulation_experiment_id: simulationExperimentId,
  })

  expect(svg).toContain("Operating point did not converge")
  expect(svg).toContain("oscillator may have no stable DC state")
  expect(svg).toMatchSvgSnapshot(import.meta.path, "non-convergent")
})
