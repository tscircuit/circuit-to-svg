import { expect, test } from "bun:test"
import { createElement } from "react"
import {
  convertCircuitJsonToSchematicSimulationSvg,
  convertCircuitJsonToSimulationGraphSvg,
} from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

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

async function createResistorSchematicCircuitJson(): Promise<
  CircuitJsonWithSimulation[]
> {
  const { circuit } = getTestFixture()

  circuit.add(
    createElement(
      "board",
      { width: "10mm", height: "10mm", routingDisabled: true },
      createElement("resistor", {
        name: "R1",
        resistance: "10",
        footprint: "0402",
        symbolName: "boxresistor_right",
      }),
    ),
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson() as CircuitJsonWithSimulation[]
}

async function withResistorSchematic(
  circuitJson: CircuitJsonWithSimulation[],
): Promise<CircuitJsonWithSimulation[]> {
  return [...(await createResistorSchematicCircuitJson()), ...circuitJson]
}

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

test("uses oscilloscope traces through voltage graph provenance", () => {
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
    },
    {
      type: "simulation_voltage_probe",
      simulation_voltage_probe_id: "simulation_voltage_probe_l1",
      name: "L1_PROBE",
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
    {
      type: "simulation_oscilloscope_trace",
      simulation_oscilloscope_trace_id: "scope-trace-vout",
      simulation_transient_voltage_graph_id: "graph-vout",
      display_name: "VO",
      color: "#315cff",
      display_center_value: 3.3,
      display_center_offset_divs: 3,
      volts_per_div: 0.05,
    },
    {
      type: "simulation_oscilloscope_trace",
      simulation_oscilloscope_trace_id: "scope-trace-l1",
      simulation_transient_voltage_graph_id: "graph-l1",
      display_name: "L1",
      color: "#ff8c00",
      display_center_value: 0,
      display_center_offset_divs: 1,
      volts_per_div: 5,
    },
  ]

  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: circuitWithProbeDisplay,
    simulation_experiment_id: "exp-probe-display-test",
    width: 400,
    height: 300,
  })

  expect(svg).toContain('class="scope-legend"')
  expect(svg).toContain("Ch1")
  expect(svg).toContain("Ch2")
  expect(svg).toContain("50 mV/div")
  expect(svg).toContain("5 V/div")
  expect(svg).toContain("3.3 V")
  expect(svg).toContain('width="400"')
  expect(svg).toContain('height="442"')
  expect(svg).toMatchSvgSnapshot(import.meta.path, "oscilloscope-trace-display")
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
      start_time_ms: 0,
      end_time_ms: 3,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3],
      current_levels: [0, 0.015, 0.01, 0.02],
      name: "I(load)",
    },
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
  expect(svg).toContain("I(LOAD_CURRENT)")
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
      start_time_ms: 0,
      end_time_ms: 4,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4],
      voltage_levels: [0, 1.8, 3.3, 3.1, 3.3],
      name: "V(out)",
    },
    {
      type: "simulation_transient_current_graph",
      simulation_transient_current_graph_id: "current-graph-load",
      simulation_experiment_id: "exp-mixed-test",
      source_component_id: "ammeter-1",
      start_time_ms: 0,
      end_time_ms: 4,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2, 3, 4],
      current_levels: [0, 0.012, 0.018, 0.011, 0.016],
      name: "I(load)",
    },
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
  expect(svg).toContain("V(VOUT)")
  expect(svg).toContain("I(LOAD_CURRENT)")
  expect(svg).toContain("#315cff")
  expect(svg).toContain("#b00020")
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "mixed-current-voltage-graph",
  )
})

test("uses oscilloscope traces for mixed voltage and current graphs", () => {
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
      source_component_id: "voltage-probe-1",
      name: "VOUT",
    },
    {
      type: "simulation_current_probe",
      simulation_current_probe_id: "simulation_current_probe_load",
      source_component_id: "ammeter-1",
      name: "LOAD_CURRENT",
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "voltage-graph-vout",
      simulation_experiment_id: "exp-mixed-display-test",
      source_component_id: "voltage-probe-1",
      start_time_ms: 0,
      end_time_ms: 2,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2],
      voltage_levels: [3.23, 3.25, 3.27],
    },
    {
      type: "simulation_transient_current_graph",
      simulation_transient_current_graph_id: "current-graph-load",
      simulation_experiment_id: "exp-mixed-display-test",
      source_component_id: "ammeter-1",
      start_time_ms: 0,
      end_time_ms: 2,
      time_per_step: 1,
      timestamps_ms: [0, 1, 2],
      current_levels: [0.005, 0.01, 0.015],
    },
    {
      type: "simulation_oscilloscope_trace",
      simulation_oscilloscope_trace_id: "scope-trace-vout",
      simulation_voltage_probe_id: "simulation_voltage_probe_vout",
      display_name: "Vo",
      display_center_value: 3.25,
      display_center_offset_divs: 2,
      volts_per_div: 0.02,
    },
    {
      type: "simulation_oscilloscope_trace",
      simulation_oscilloscope_trace_id: "scope-trace-load",
      simulation_current_probe_id: "simulation_current_probe_load",
      display_name: "IL",
      display_center_value: 0.01,
      display_center_offset_divs: -1,
      amps_per_div: 0.005,
    },
  ]

  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: circuitWithMixedDisplayGraphs,
    simulation_experiment_id: "exp-mixed-display-test",
    width: 500,
    height: 320,
  })

  expect(svg).toContain("axis-y-scope")
  expect(svg).not.toContain(">Display (div)</text>")
  expect(svg).not.toContain(">Value</text>")
  expect(svg).toContain('class="scope-legend"')
  expect(svg).toContain("20 mV/div")
  expect(svg).toContain("5 mA/div")
  expect(svg).toContain("Vo")
  expect(svg).toContain("IL")
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "mixed-current-voltage-scope-legend",
  )
})

function createScopeDisplayCircuit(
  channelCount: number,
  experimentId: string,
  options: { includeCurrentChannel?: boolean } = {},
): CircuitJsonWithSimulation[] {
  const circuit: CircuitJsonWithSimulation[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: experimentId,
      name: `${channelCount} Channel Scope Display`,
      experiment_type: "spice_transient_analysis",
    },
  ]

  for (let index = 0; index < channelCount; index++) {
    const channelNumber = index + 1
    const isCurrentChannel =
      Boolean(options.includeCurrentChannel) && channelNumber === channelCount
    const color =
      ["#315cff", "#ff8c00", "#00c88a", "#ff42e6", "#7c4dff"][index] ??
      "#315cff"

    if (isCurrentChannel) {
      const probeId = `simulation_current_probe_ch${channelNumber}`
      const graphId = `graph-ch${channelNumber}`
      circuit.push(
        {
          type: "simulation_current_probe",
          simulation_current_probe_id: probeId,
          name: `CHANNEL_${channelNumber}`,
        },
        {
          type: "simulation_transient_current_graph",
          simulation_transient_current_graph_id: graphId,
          simulation_experiment_id: experimentId,
          source_probe_id: probeId,
          source_probe_name: `CHANNEL_${channelNumber}`,
          start_time_ms: 0,
          end_time_ms: 2,
          time_per_step: 1,
          timestamps_ms: [0, 1, 2],
          current_levels: [
            channelNumber / 1000 - 0.0001,
            channelNumber / 1000,
            channelNumber / 1000 + 0.0001,
          ],
        } as unknown as CircuitJsonWithSimulation,
        {
          type: "simulation_oscilloscope_trace",
          simulation_oscilloscope_trace_id: `scope-trace-ch${channelNumber}`,
          simulation_transient_current_graph_id: graphId,
          display_name: `CH${channelNumber}_SIG`,
          color,
          display_center_value: channelNumber / 1000,
          display_center_offset_divs: channelNumber - 3,
          amps_per_div: channelNumber / 1000,
        },
      )
      continue
    }

    const probeId = `simulation_voltage_probe_ch${channelNumber}`
    const graphId = `graph-ch${channelNumber}`
    circuit.push(
      {
        type: "simulation_voltage_probe",
        simulation_voltage_probe_id: probeId,
        name: `CHANNEL_${channelNumber}`,
      },
      {
        type: "simulation_transient_voltage_graph",
        simulation_transient_voltage_graph_id: graphId,
        simulation_experiment_id: experimentId,
        source_probe_id: probeId,
        source_probe_name: `CHANNEL_${channelNumber}`,
        start_time_ms: 0,
        end_time_ms: 2,
        time_per_step: 1,
        timestamps_ms: [0, 1, 2],
        voltage_levels: [
          channelNumber - 0.1,
          channelNumber,
          channelNumber + 0.1,
        ],
      } as unknown as CircuitJsonWithSimulation,
      {
        type: "simulation_oscilloscope_trace",
        simulation_oscilloscope_trace_id: `scope-trace-ch${channelNumber}`,
        simulation_transient_voltage_graph_id: graphId,
        display_name: `CH${channelNumber}_SIG`,
        color,
        display_center_value: channelNumber,
        display_center_offset_divs: channelNumber - 3,
        volts_per_div: channelNumber === 1 ? 0.05 : channelNumber,
      },
    )
  }

  return circuit
}

test("renders schematic simulation layout for 4 oscilloscope trace channels", async () => {
  const svg = convertCircuitJsonToSchematicSimulationSvg({
    circuitJson: await withResistorSchematic(
      createScopeDisplayCircuit(4, "exp-four-channel-display"),
    ),
    simulation_experiment_id: "exp-four-channel-display",
    width: 500,
    height: 1000,
    schematicHeightRatio: 0.48,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path, "four-channel-scope-legend")
})

test("renders schematic simulation layout for 5 oscilloscope trace channels", async () => {
  const svg = convertCircuitJsonToSchematicSimulationSvg({
    circuitJson: await withResistorSchematic(
      createScopeDisplayCircuit(5, "exp-five-channel-display", {
        includeCurrentChannel: true,
      }),
    ),
    simulation_experiment_id: "exp-five-channel-display",
    width: 500,
    height: 1000,
    schematicHeightRatio: 0.36,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path, "five-channel-scope-legend")
})
