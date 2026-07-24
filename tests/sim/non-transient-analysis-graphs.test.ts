import { expect, test } from "bun:test"
import { convertCircuitJsonToSimulationGraphSvg } from "lib/sim/convert-circuit-json-to-simulation-graph-svg"
import type { AcSweepView } from "lib/sim/normalize-simulation-analysis-results"
import type { CircuitJsonWithSimulation } from "lib/sim/types"
import {
  acDecadeSweepCircuitJson,
  acLinearSweepCircuitJson,
  acOctaveSweepCircuitJson,
  dcCurrentSweepCircuitJson,
  dcOperatingPointCircuitJson,
  dcVoltageSweepCircuitJson,
  parameterAcSweepCircuitJson,
  parameterDcSweepCircuitJson,
  parameterOperatingPointCircuitJson,
  parameterTransientCircuitJson,
} from "tests/fixtures/non-transient-simulation-results"

const testAnalysisGraph = ({
  name,
  circuitJson,
  experimentId,
  snapshotName,
  acSweepView,
  resultIds,
}: {
  name: string
  circuitJson: CircuitJsonWithSimulation[]
  experimentId: string
  snapshotName: string
  acSweepView?: AcSweepView
  resultIds?: string[]
}) => {
  test(name, () => {
    const svg = convertCircuitJsonToSimulationGraphSvg({
      circuitJson,
      simulation_experiment_id: experimentId,
      ac_sweep_view: acSweepView,
      simulation_result_ids: resultIds,
    })

    expect(svg).toMatchSvgSnapshot(import.meta.path, snapshotName)
  })
}

testAnalysisGraph({
  name: "renders DC operating point voltage and current results",
  circuitJson: dcOperatingPointCircuitJson,
  experimentId: "simulation_experiment_dc_operating_point",
  snapshotName: "dc-operating-point-voltage-and-current",
})

for (const { resultKind, resultId } of [
  {
    resultKind: "voltage",
    resultId: "simulation_dc_operating_point_voltage_vout",
  },
  {
    resultKind: "current",
    resultId: "simulation_dc_operating_point_current_load",
  },
]) {
  testAnalysisGraph({
    name: `visually covers the DC operating point ${resultKind} result type`,
    circuitJson: dcOperatingPointCircuitJson,
    experimentId: "simulation_experiment_dc_operating_point",
    snapshotName: `result-type-dc-operating-point-${resultKind}`,
    resultIds: [resultId],
  })
}

testAnalysisGraph({
  name: "renders voltage-source DC sweep voltage and current results",
  circuitJson: dcVoltageSweepCircuitJson,
  experimentId: "simulation_experiment_dc_voltage_sweep",
  snapshotName: "dc-voltage-sweep-voltage-and-current",
})

testAnalysisGraph({
  name: "renders current-source DC sweep voltage and current results",
  circuitJson: dcCurrentSweepCircuitJson,
  experimentId: "simulation_experiment_dc_current_sweep",
  snapshotName: "dc-current-sweep-voltage-and-current",
})

for (const { resultKind, resultId } of [
  {
    resultKind: "voltage",
    resultId: "simulation_dc_voltage_sweep_graph_vout",
  },
  {
    resultKind: "current",
    resultId: "simulation_dc_voltage_sweep_graph_load",
  },
]) {
  testAnalysisGraph({
    name: `visually covers the DC sweep ${resultKind} graph type`,
    circuitJson: dcVoltageSweepCircuitJson,
    experimentId: "simulation_experiment_dc_voltage_sweep",
    snapshotName: `result-type-dc-sweep-${resultKind}`,
    resultIds: [resultId],
  })
}

for (const { sweepType, circuitJson, experimentId } of [
  {
    sweepType: "linear",
    circuitJson: acLinearSweepCircuitJson,
    experimentId: "simulation_experiment_ac_linear_sweep",
  },
  {
    sweepType: "decade",
    circuitJson: acDecadeSweepCircuitJson,
    experimentId: "simulation_experiment_ac_decade_sweep",
  },
  {
    sweepType: "octave",
    circuitJson: acOctaveSweepCircuitJson,
    experimentId: "simulation_experiment_ac_octave_sweep",
  },
]) {
  for (const acSweepView of ["magnitude", "phase"] as const) {
    testAnalysisGraph({
      name: `renders ${sweepType} AC sweep voltage and current ${acSweepView} results`,
      circuitJson,
      experimentId,
      snapshotName: `ac-${sweepType}-sweep-voltage-and-current-${acSweepView}`,
      acSweepView,
    })
  }
}

for (const { resultKind, resultId } of [
  {
    resultKind: "voltage",
    resultId: "simulation_experiment_ac_decade_sweep_voltage_vout",
  },
  {
    resultKind: "current",
    resultId: "simulation_experiment_ac_decade_sweep_current_input",
  },
]) {
  for (const acSweepView of ["magnitude", "phase"] as const) {
    testAnalysisGraph({
      name: `visually covers the AC sweep ${resultKind} graph ${acSweepView} view`,
      circuitJson: acDecadeSweepCircuitJson,
      experimentId: "simulation_experiment_ac_decade_sweep",
      snapshotName: `result-type-ac-sweep-${resultKind}-${acSweepView}`,
      acSweepView,
      resultIds: [resultId],
    })
  }
}

testAnalysisGraph({
  name: "renders parameter-swept transient voltage and current results",
  circuitJson: parameterTransientCircuitJson,
  experimentId: "simulation_experiment_parameter_transient",
  snapshotName: "parameter-sweep-transient-voltage-and-current",
})

testAnalysisGraph({
  name: "renders parameter-swept DC operating point voltage and current results",
  circuitJson: parameterOperatingPointCircuitJson,
  experimentId: "simulation_experiment_parameter_operating_point",
  snapshotName: "parameter-sweep-operating-point-voltage-and-current",
})

testAnalysisGraph({
  name: "renders parameter-swept DC sweep voltage and current results",
  circuitJson: parameterDcSweepCircuitJson,
  experimentId: "simulation_experiment_parameter_dc_sweep",
  snapshotName: "parameter-sweep-dc-voltage-and-current",
})

for (const acSweepView of ["magnitude", "phase"] as const) {
  testAnalysisGraph({
    name: `renders parameter-swept AC voltage and current ${acSweepView} results`,
    circuitJson: parameterAcSweepCircuitJson,
    experimentId: "simulation_experiment_parameter_ac_sweep",
    snapshotName: `parameter-sweep-ac-voltage-and-current-${acSweepView}`,
    acSweepView,
  })
}
