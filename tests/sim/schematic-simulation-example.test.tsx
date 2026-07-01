import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSimulationSvg } from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

const TPS63802_EXAMPLE_SIMULATION_ID = "tps63802_pfm_buck_example"
const TPS63802_EXAMPLE_NAME = "TPS63802 Switching Waveforms PFM Buck Operation"

async function createTps63802ExampleCircuitJson(): Promise<
  CircuitJsonWithSimulation[]
> {
  const { circuit } = getTestFixture()

  // Adapted from the upstream TI example circuit. The local test runtime
  // doesn't provide the external part package or ngspice-backed ammeter.
  circuit.add(
    <board bomDisabled routingDisabled schMaxTraceDistance={3}>
      <chip
        name="U1"
        footprint="soic8"
        schX={0}
        schY={0}
        schWidth={2.5}
        schHeight={6}
        showPinAliases={false}
        pinLabels={{
          pin1: "L1",
          pin2: "L2",
          pin3: "VIN",
          pin4: "EN",
          pin5: "MODE",
          pin6: "GND",
          pin7: "VOUT",
          pin8: "PG",
          pin9: "FB",
          pin10: "AGND",
        }}
        schPinArrangement={{
          topSide: { pins: ["L1", "L2"], direction: "left-to-right" },
          leftSide: {
            pins: ["VIN", "EN", "MODE", "GND"],
            direction: "top-to-bottom",
          },
          rightSide: {
            pins: ["VOUT", "PG", "FB", "AGND"],
            direction: "top-to-bottom",
          },
        }}
        schPinStyle={{
          L2: { marginLeft: 1 },
          VIN: { marginBottom: 1 },
          EN: { marginBottom: 1 },
          MODE: { marginBottom: 1 },
          VOUT: { marginBottom: 1 },
          PG: { marginBottom: 1 },
          FB: { marginBottom: 1 },
        }}
      />

      <voltagesource
        name="V_IN"
        voltage="4.2V"
        schX={-7.2}
        schY={0}
        schRotation="270deg"
      />

      <inductor
        name="L1"
        inductance={4.7e-7}
        footprint="0603"
        schX={0}
        schY={5}
        schOrientation="horizontal"
      />

      <resistor
        name="R_L1_DCR"
        resistance="0.0076"
        footprint="0603"
        schX={1.4}
        schY={5}
        schOrientation="horizontal"
      />

      <capacitor
        name="C1"
        capacitance="5uF"
        footprint="0603"
        schX={-4.8}
        schY={-2}
        schOrientation="vertical"
      />
      <resistor
        name="R_CIN_ESR"
        resistance="0.01"
        footprint="0603"
        schX={-4.8}
        schY={0}
        schOrientation="vertical"
      />

      <capacitor
        name="C2"
        capacitance="8.2uF"
        footprint="0805"
        schX={5.5}
        schY={-1}
        schOrientation="vertical"
      />
      <resistor
        name="R_COUT_ESR"
        resistance="0.01"
        footprint="0603"
        schX={5.5}
        schY={0.5}
        schOrientation="vertical"
      />

      <resistor
        name="R1"
        resistance="511k"
        footprint="0603"
        schX={4.1}
        schY={1}
        schOrientation="vertical"
      />

      <resistor
        name="R2"
        resistance="91k"
        footprint="0603"
        schX={4.1}
        schY={-1}
        schOrientation="vertical"
      />

      <resistor
        name="R3"
        resistance="100k"
        footprint="0603"
        schX={2.7}
        schY={1.8}
        schOrientation="vertical"
      />

      <resistor
        name="R_LOAD"
        resistance="82.5"
        footprint="0603"
        schX={7}
        schY={-1}
        schOrientation="vertical"
      />

      <netlabel
        net="VIN"
        connection="U1.VIN"
        schX={-3.7}
        schY={1.8}
        anchorSide="right"
      />
      <schematictext
        text="VIN 1.3V-5.5V"
        schX={-4}
        schY={2.2}
        fontSize={0.18}
        anchor="center"
      />
      <netlabel
        net="VOUT"
        connection="U1.VOUT"
        schX={1.7}
        schY={1.8}
        anchorSide="left"
      />
      <schematictext
        text="VOUT = 3.3V"
        schX={2}
        schY={2.2}
        fontSize={0.15}
        anchor="center"
      />

      <trace from="V_IN.pin1" to="U1.VIN" />
      <trace from="V_IN.pin2" to="net.GND" />

      <trace from="U1.L1" to="L1.pin1" />
      <trace from="L1.pin2" to="R_L1_DCR.pin1" />
      <trace from="R_L1_DCR.pin2" to="U1.L2" />

      <trace from="U1.VIN" to="R_CIN_ESR.pin1" />
      <trace from="R_CIN_ESR.pin2" to="C1.pin1" />
      <trace from="U1.VIN" to="U1.EN" />
      <trace from="U1.VIN" to="R3.pin1" />

      <trace from="U1.VOUT" to="R_COUT_ESR.pin1" />
      <trace from="R_COUT_ESR.pin2" to="C2.pin1" />
      <trace from="R1.pin1" to="U1.VOUT" />

      <trace from="U1.VOUT" to="R_LOAD.pin1" />
      <trace from="R_LOAD.pin2" to="net.GND" />

      <trace from="U1.PG" to="R3.pin2" />
      <trace from="U1.FB" to="R1.pin2" />
      <trace from="U1.FB" to="R2.pin1" />

      <trace from="U1.MODE" to="net.GND" />
      <trace from="U1.GND" to="net.GND" />
      <trace from="U1.AGND" to="net.GND" />
      <trace from="C1.pin2" to="net.GND" />
      <trace from="C2.pin2" to="net.GND" />
      <trace from="R2.pin2" to="net.GND" />

      <voltageprobe
        name="VOUT_PROBE"
        connectsTo="U1.VOUT"
        referenceTo="U1.GND"
        color="#315cff"
        graphDisplayName="VO"
        graphCenter={3.3}
        graphOffsetDivs={3}
        graphUnitsPerDiv={0.15}
      />
      <voltageprobe
        name="L1_PROBE"
        connectsTo="U1.L1"
        referenceTo="U1.GND"
        color="#00d98b"
        graphDisplayName="L1"
        graphCenter={0}
        graphOffsetDivs={2}
        graphUnitsPerDiv={6.5}
      />
      <voltageprobe
        name="L2_PROBE"
        connectsTo="U1.L2"
        referenceTo="U1.GND"
        color="#f1b400"
        graphDisplayName="L2"
        graphCenter={0}
        graphOffsetDivs={1}
        graphUnitsPerDiv={5.5}
      />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson() as CircuitJsonWithSimulation[]
}

function withExampleSimulationData(
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
  ): CircuitJsonWithSimulation => ({
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id: id,
    simulation_experiment_id: TPS63802_EXAMPLE_SIMULATION_ID,
    source_probe_id: probe.simulation_voltage_probe_id,
    source_probe_name: probe.name,
    start_time_ms: 0,
    end_time_ms: 0.018,
    time_per_step: 0.006,
    timestamps_ms: timestampsMs,
    voltage_levels: voltageLevels,
  })

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
      simulation_experiment_id: TPS63802_EXAMPLE_SIMULATION_ID,
      name: TPS63802_EXAMPLE_NAME,
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
      simulation_experiment_id: TPS63802_EXAMPLE_SIMULATION_ID,
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
  "renders TPS63802-style schematic simulation example",
  async () => {
    const circuitJson = withExampleSimulationData(
      await createTps63802ExampleCircuitJson(),
    )

    const svg = convertCircuitJsonToSchematicSimulationSvg({
      circuitJson,
      simulation_experiment_id: TPS63802_EXAMPLE_SIMULATION_ID,
      width: 560,
      height: 980,
      schematicHeightRatio: 0.48,
    })

    expect(svg).toContain(TPS63802_EXAMPLE_NAME)
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
