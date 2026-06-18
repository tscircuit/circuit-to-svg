import { expect, test } from "bun:test"
import { convertCircuitJsonToSimulationGraphSvg } from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"

const simulationExperimentId = "exp-1"

const circuitJson: CircuitJsonWithSimulation[] = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: simulationExperimentId,
    name: "Transient Voltage Sweep",
    experiment_type: "spice_transient_analysis",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-1",
    simulation_experiment_id: simulationExperimentId,
    source_component_id: "vp-1",
    subcircuit_connectivity_map_key: "net-1",
    start_time_ms: 0,
    end_time_ms: 10,
    time_per_step: 2,
    timestamps_ms: [0, 2, 4, 6, 8, 10],
    voltage_levels: [0, 1.5, 3, 2, 1, 0.5],
    name: "V(out)",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-2",
    simulation_experiment_id: simulationExperimentId,
    source_component_id: "vp-2",
    start_time_ms: 0,
    end_time_ms: 10,
    time_per_step: 1,
    voltage_levels: [0, -0.5, 0.25, 1.25, 0.5, -0.25, 0.75, 1.1, 0.9, 0.5, 0.2],
    name: "V(in)",
  },
  {
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: "graph-3",
    simulation_experiment_id: simulationExperimentId,
    start_time_ms: 0,
    end_time_ms: 10,
    time_per_step: 5,
    voltage_levels: [3, 3, 3],
    name: "V(ref)",
  },
]

test("renders all transient voltage graphs", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: simulationExperimentId,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("filters by simulation_transient_voltage_graph_ids", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: simulationExperimentId,
    simulation_transient_voltage_graph_ids: ["graph-1", "graph-3"],
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path, "filtered")
})

test("uses voltage probe name as label fallback", () => {
  const circuitWithProbe: CircuitJsonWithSimulation[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "exp-probe-test",
      name: "Test with Voltage Probe",
      experiment_type: "spice_transient_analysis",
    },
    {
      type: "simulation_voltage_probe",
      simulation_voltage_probe_id: "simulation_voltage_probe_0",
      source_component_id: "probe-1",
      name: "V_PROBE_1",
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-1",
      simulation_experiment_id: "exp-probe-test",
      source_component_id: "probe-1",
      start_time_ms: 0,
      end_time_ms: 5,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4, 5],
      voltage_levels: [0, 1.2, 2, 2.3, 1.8, 0.5],
      name: "V(graph_label_should_be_overridden_by_probe_name)",
      // Both graph and probe have names; should prefer probe name
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-2",
      simulation_experiment_id: "exp-probe-test",
      source_component_id: "probe-does-not-exist",
      start_time_ms: 0,
      end_time_ms: 5,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4, 5],
      voltage_levels: [3, 2.8, 2, 1.3, 0.8, 0.2],
      name: "V(signal_2)", // name property should take precedence
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-3",
      simulation_experiment_id: "exp-probe-test",
      source_component_id: "probe-2",
      start_time_ms: 0,
      end_time_ms: 5,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4, 5],
      voltage_levels: [1, 1, 1, 1, 1, 1],
    },
  ]

  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: circuitWithProbe,
    simulation_experiment_id: "exp-probe-test",
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path, "with-probe-names")
})

test("uses voltage probe display options through graph provenance", () => {
  const circuitWithProbeDisplay: CircuitJsonWithSimulation[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "exp-probe-display-test",
      name: "Scope-style Probe Display",
      experiment_type: "spice_transient_analysis",
    },
    {
      type: "simulation_voltage_probe",
      simulation_voltage_probe_id: "simulation_voltage_probe_vout",
      name: "VOUT_PROBE",
      color: "#315cff",
      display_options: {
        label: "VO",
        center: 3.3,
        offset_divs: 3,
        units_per_div: 0.05,
      },
    },
    {
      type: "simulation_voltage_probe",
      simulation_voltage_probe_id: "simulation_voltage_probe_l1",
      name: "L1_PROBE",
      color: "#ff8c00",
      display_options: {
        label: "L1",
        center: 0,
        offset_divs: 1,
        units_per_div: 5,
      },
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-vout",
      simulation_experiment_id: "exp-probe-display-test",
      source_probe_id: "simulation_voltage_probe_vout",
      source_probe_name: "VOUT_PROBE",
      start_time_ms: 0,
      end_time_ms: 2,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2],
      voltage_levels: [3.25, 3.3, 3.35],
      name: "N5",
    } as CircuitJsonWithSimulation,
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph-l1",
      simulation_experiment_id: "exp-probe-display-test",
      source_probe_id: "simulation_voltage_probe_l1",
      source_probe_name: "L1_PROBE",
      start_time_ms: 0,
      end_time_ms: 2,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2],
      voltage_levels: [0, 5, 10],
      name: "N7",
    } as CircuitJsonWithSimulation,
  ]

  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: circuitWithProbeDisplay,
    simulation_experiment_id: "exp-probe-display-test",
    width: 400,
    height: 300,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path, "probe-display-options")
})

test("renders transient current graphs with current probe metadata", () => {
  const circuitWithCurrentGraph: CircuitJsonWithSimulation[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "exp-current-test",
      name: "Transient Current Sweep",
      experiment_type: "spice_transient_analysis",
    },
    {
      type: "simulation_current_probe",
      simulation_current_probe_id: "simulation_current_probe_load",
      source_component_id: "ammeter-1",
      name: "LOAD_CURRENT",
      color: "#b00020",
    },
    {
      type: "simulation_transient_current_graph",
      simulation_transient_current_graph_id: "current-graph-load",
      simulation_experiment_id: "exp-current-test",
      source_component_id: "ammeter-1",
      source_probe_id: "simulation_current_probe_load",
      source_probe_name: "LOAD_CURRENT",
      start_time_ms: 0,
      end_time_ms: 3,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3],
      current_levels: [0, 0.015, 0.01, 0.02],
      name: "I(load)",
    } as CircuitJsonWithSimulation,
    {
      type: "simulation_transient_current_graph",
      simulation_transient_current_graph_id: "current-graph-unselected",
      simulation_experiment_id: "exp-current-test",
      start_time_ms: 0,
      end_time_ms: 3,
      time_per_step: 1,
      current_levels: [0.1, 0.1, 0.1, 0.1],
      name: "I(unselected)",
    },
  ]

  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: circuitWithCurrentGraph,
    simulation_experiment_id: "exp-current-test",
    simulation_transient_current_graph_ids: ["current-graph-load"],
    width: 400,
    height: 300,
  })

  expect(svg).toContain("Current (A)")
  expect(svg).toContain(
    'data-simulation-transient-current-graph-id="current-graph-load"',
  )
  expect(svg).not.toContain(
    'data-simulation-transient-current-graph-id="current-graph-unselected"',
  )
  expect(svg).toContain('data-source-probe-id="simulation_current_probe_load"')
  expect(svg).toContain("#b00020")
  expect(svg).toMatchSvgSnapshot(import.meta.path, "current-graph")
})

test("renders voltage and current graphs in the same simulation output", () => {
  const circuitWithMixedGraphs: CircuitJsonWithSimulation[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "exp-mixed-test",
      name: "Transient Voltage and Current Sweep",
      experiment_type: "spice_transient_analysis",
    },
    {
      type: "simulation_voltage_probe",
      simulation_voltage_probe_id: "simulation_voltage_probe_vout",
      source_component_id: "voltage-probe-1",
      name: "VOUT",
      color: "#315cff",
    },
    {
      type: "simulation_current_probe",
      simulation_current_probe_id: "simulation_current_probe_load",
      source_component_id: "ammeter-1",
      name: "LOAD_CURRENT",
      color: "#b00020",
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "voltage-graph-vout",
      simulation_experiment_id: "exp-mixed-test",
      source_component_id: "voltage-probe-1",
      source_probe_id: "simulation_voltage_probe_vout",
      source_probe_name: "VOUT",
      start_time_ms: 0,
      end_time_ms: 4,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4],
      voltage_levels: [0, 1.8, 3.3, 3.1, 3.3],
      name: "V(out)",
    } as CircuitJsonWithSimulation,
    {
      type: "simulation_transient_current_graph",
      simulation_transient_current_graph_id: "current-graph-load",
      simulation_experiment_id: "exp-mixed-test",
      source_component_id: "ammeter-1",
      source_probe_id: "simulation_current_probe_load",
      source_probe_name: "LOAD_CURRENT",
      start_time_ms: 0,
      end_time_ms: 4,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4],
      current_levels: [0, 0.012, 0.018, 0.011, 0.016],
      name: "I(load)",
    } as CircuitJsonWithSimulation,
  ]

  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: circuitWithMixedGraphs,
    simulation_experiment_id: "exp-mixed-test",
    width: 500,
    height: 320,
  })

  expect(svg).toContain(">Value</text>")
  expect(svg).not.toContain(">Display (div)</text>")
  expect(svg).toContain(
    'data-simulation-transient-voltage-graph-id="voltage-graph-vout"',
  )
  expect(svg).toContain(
    'data-simulation-transient-current-graph-id="current-graph-load"',
  )
  expect(svg).toContain('data-source-probe-id="simulation_voltage_probe_vout"')
  expect(svg).toContain('data-source-probe-id="simulation_current_probe_load"')
  expect(svg).toContain("#315cff")
  expect(svg).toContain("#b00020")
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "mixed-current-voltage-graph",
  )
})

test("uses display divisions for mixed voltage and current graphs with display options", () => {
  const circuitWithMixedDisplayGraphs: CircuitJsonWithSimulation[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "exp-mixed-display-test",
      name: "Mixed Scope Display",
      experiment_type: "spice_transient_analysis",
    },
    {
      type: "simulation_voltage_probe",
      simulation_voltage_probe_id: "simulation_voltage_probe_vout",
      name: "VOUT",
      display_options: {
        label: "Vo",
        center: 3.25,
        offset_divs: 2,
        units_per_div: 0.02,
      },
    },
    {
      type: "simulation_current_probe",
      simulation_current_probe_id: "simulation_current_probe_load",
      name: "LOAD_CURRENT",
      display_options: {
        label: "IL",
        center: 0.01,
        offset_divs: -1,
        units_per_div: 0.005,
      },
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "voltage-graph-vout",
      simulation_experiment_id: "exp-mixed-display-test",
      source_probe_id: "simulation_voltage_probe_vout",
      source_probe_name: "VOUT",
      start_time_ms: 0,
      end_time_ms: 2,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2],
      voltage_levels: [3.23, 3.25, 3.27],
    } as CircuitJsonWithSimulation,
    {
      type: "simulation_transient_current_graph",
      simulation_transient_current_graph_id: "current-graph-load",
      simulation_experiment_id: "exp-mixed-display-test",
      source_probe_id: "simulation_current_probe_load",
      source_probe_name: "LOAD_CURRENT",
      start_time_ms: 0,
      end_time_ms: 2,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2],
      current_levels: [0.005, 0.01, 0.015],
    } as CircuitJsonWithSimulation,
  ]

  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: circuitWithMixedDisplayGraphs,
    simulation_experiment_id: "exp-mixed-display-test",
    width: 500,
    height: 320,
  })

  expect(svg).toContain(">Display (div)</text>")
  expect(svg).not.toContain(">Value</text>")
  expect(svg).toContain("Vo")
  expect(svg).toContain("IL")
})
