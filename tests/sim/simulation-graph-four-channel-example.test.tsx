import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSimulationSvg } from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

const FOUR_CHANNEL_SIMULATION_ID = "four_channel_scope_example"
const FOUR_CHANNEL_NAME = "Four Channel Scope Display"

// The dynamic legend layout under test only depends on the simulation
// probes/graphs/traces appended below, not on the circuit topology, so the
// schematic is just a placeholder resistor the probes attach to.
async function createFourChannelCircuitJson(): Promise<
  CircuitJsonWithSimulation[]
> {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <resistor
        name="R1"
        resistance="10"
        footprint="0402"
        symbolName="boxresistor_right"
      />
      <voltageprobe
        name="VOUT_PROBE"
        connectsTo="R1.pin1"
        referenceTo="R1.pin2"
        color="#315cff"
      />
      <voltageprobe
        name="L1_PROBE"
        connectsTo="R1.pin1"
        referenceTo="R1.pin2"
        color="#00d98b"
      />
      <voltageprobe
        name="L2_PROBE"
        connectsTo="R1.pin1"
        referenceTo="R1.pin2"
        color="#f1b400"
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson() as CircuitJsonWithSimulation[]
}

function withFourChannelSimulationData(
  circuitJson: CircuitJsonWithSimulation[],
): CircuitJsonWithSimulation[] {
  const timestampsMs = [0, 0.006, 0.012, 0.018]
  const findVoltageProbe = (name: string) => {
    const probe = circuitJson.find(
      (element) =>
        element.type === "simulation_voltage_probe" && element.name === name,
    )
    if (!probe || probe.type !== "simulation_voltage_probe") {
      throw new Error(`Missing simulation voltage probe: ${name}`)
    }
    return probe
  }

  const voutProbe = findVoltageProbe("VOUT_PROBE")
  const l1Probe = findVoltageProbe("L1_PROBE")
  const l2Probe = findVoltageProbe("L2_PROBE")

  const createVoltageGraph = (
    id: string,
    probe: { simulation_voltage_probe_id: string; name?: string },
    voltageLevels: number[],
  ): CircuitJsonWithSimulation =>
    ({
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: id,
      simulation_experiment_id: FOUR_CHANNEL_SIMULATION_ID,
      source_probe_id: probe.simulation_voltage_probe_id,
      source_probe_name: probe.name,
      start_time_ms: 0,
      end_time_ms: 0.018,
      time_per_step: 0.006,
      timestamps_ms: timestampsMs,
      voltage_levels: voltageLevels,
    }) as CircuitJsonWithSimulation

  const createScopeTrace = (
    id: string,
    graphId: string,
    displayName: string,
    color: string,
    center: number,
    offsetDivs: number,
    valuePerDiv: { volts?: number; amps?: number },
  ): CircuitJsonWithSimulation => ({
    type: "simulation_oscilloscope_trace",
    simulation_oscilloscope_trace_id: id,
    display_name: displayName,
    color,
    display_center_value: center,
    display_center_offset_divs: offsetDivs,
    ...(valuePerDiv.volts !== undefined
      ? {
          simulation_transient_voltage_graph_id: graphId,
          volts_per_div: valuePerDiv.volts,
        }
      : {
          simulation_transient_current_graph_id: graphId,
          amps_per_div: valuePerDiv.amps,
        }),
  })

  return [
    ...circuitJson,
    {
      type: "simulation_experiment",
      simulation_experiment_id: FOUR_CHANNEL_SIMULATION_ID,
      name: FOUR_CHANNEL_NAME,
      experiment_type: "spice_transient_analysis",
    },
    {
      type: "simulation_current_probe",
      simulation_current_probe_id: "simulation_current_probe_il",
      name: "IL_PROBE",
      color: "#d946ef",
    },
    createVoltageGraph("graph_vout", voutProbe, [3.26, 3.3, 3.34, 3.31]),
    createVoltageGraph("graph_l1", l1Probe, [-5.5, 6.5, -4.8, 5.8]),
    createVoltageGraph("graph_l2", l2Probe, [-4.5, 5.6, -4.2, 5.1]),
    {
      type: "simulation_transient_current_graph",
      simulation_transient_current_graph_id: "graph_il",
      simulation_experiment_id: FOUR_CHANNEL_SIMULATION_ID,
      source_probe_id: "simulation_current_probe_il",
      source_probe_name: "IL_PROBE",
      start_time_ms: 0,
      end_time_ms: 0.018,
      time_per_step: 0.006,
      timestamps_ms: timestampsMs,
      current_levels: [-0.32, 0.48, -0.28, 0.42],
    } as CircuitJsonWithSimulation,
    createScopeTrace(
      "scope_trace_vout",
      "graph_vout",
      "VO",
      "#315cff",
      3.3,
      3,
      { volts: 0.15 },
    ),
    createScopeTrace("scope_trace_l1", "graph_l1", "L1", "#00d98b", 0, 2, {
      volts: 6.5,
    }),
    createScopeTrace("scope_trace_l2", "graph_l2", "L2", "#f1b400", 0, 1, {
      volts: 5.5,
    }),
    createScopeTrace("scope_trace_il", "graph_il", "IL", "#d946ef", 0, 0, {
      amps: 0.8,
    }),
  ]
}

test(
  "renders four channel scope legend on a single row",
  async () => {
    const circuitJson = withFourChannelSimulationData(
      await createFourChannelCircuitJson(),
    )

    const svg = convertCircuitJsonToSchematicSimulationSvg({
      circuitJson,
      simulation_experiment_id: FOUR_CHANNEL_SIMULATION_ID,
      width: 560,
      height: 980,
      schematicHeightRatio: 0.48,
    })

    expect(svg).toContain(FOUR_CHANNEL_NAME)
    expect(svg).toContain('class="scope-legend"')
    expect(svg).toContain("Ch4")
    expect(svg).toContain("VO")
    expect(svg).toContain("L1")
    expect(svg).toContain("L2")
    expect(svg).toContain("IL")
    expect(svg).toMatchSvgSnapshot(import.meta.path)
  },
  { timeout: 30_000 },
)
