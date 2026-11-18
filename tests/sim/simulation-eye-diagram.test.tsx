import { expect, test } from "bun:test"
import type {
  CircuitJson,
  SimulationEyeDiagram,
  SimulationTransientVoltageGraph,
} from "circuit-json"
import {
  convertCircuitJsonToSimulationEyeDiagramSvg,
  convertCircuitJsonToSchematicSimulationSvg,
  convertCircuitJsonToSimulationGraphSvg,
} from "lib"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { getSimulationEyeDiagram } from "lib/sim/get-simulation-eye-diagram"

const eye: SimulationEyeDiagram = {
  type: "simulation_eye_diagram",
  simulation_eye_diagram_id: "receiver_eye",
  name: "Receiver",
  simulation_experiment_id: "channel",
  simulation_voltage_probe_id: "rx",
  unit_interval_ms: 0.00005,
  time_origin_ms: 0,
  start_time_ms: 0,
  end_time_ms: 0.0003,
}

// Irregular timestamps deliberately retain the short transition and overshoot samples.
const graph: SimulationTransientVoltageGraph = {
  type: "simulation_transient_voltage_graph",
  simulation_transient_voltage_graph_id: "rx_voltage",
  simulation_experiment_id: "channel",
  simulation_voltage_probe_id: "rx",
  start_time_ms: 0,
  end_time_ms: 0.0003,
  time_per_step: 0.000002,
  timestamps_ms: [
    0, 20, 48, 50, 51, 53, 60, 98, 100, 102, 108, 145, 150, 152, 155, 160, 198,
    200, 201, 205, 210, 248, 250, 251, 253, 260, 300,
  ].map((ns) => ns * 1e-6),
  voltage_levels: [
    0, 0, 0, 1.7, 3.8, 3.1, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 1.8, -0.5, 0.2, 0, 0,
    1.6, 3.8, 3.2, 3.3, 3.3, 1.7, -0.4, 0.1, 0, 0,
  ],
}

test("eye diagrams fold complete two-UI windows and retain adaptive sample vertices", () => {
  const circuitJson: CircuitJson = [eye, graph]
  const originalCircuitJson = JSON.stringify(circuitJson)
  const { windows } = getSimulationEyeDiagram({
    circuitJson,
    simulation_eye_diagram_id: eye.simulation_eye_diagram_id,
  })
  expect(windows).toHaveLength(4)
  expect(windows[0]![0]).toEqual({ timeMs: 0, voltage: 0 })
  expect(windows[0]!.at(-1)).toEqual({ timeMs: 0.0001, voltage: 3.3 })
  expect(windows[0]).toContainEqual({ timeMs: 51e-6 - 25e-6, voltage: 3.8 })
  expect(JSON.stringify(circuitJson)).toBe(originalCircuitJson)
  const svg = convertCircuitJsonToSimulationEyeDiagramSvg({
    circuitJson,
    simulation_eye_diagram_id: eye.simulation_eye_diagram_id,
    width: 800,
    height: 480,
  })
  expect(svg).toContain('data-eye-window-count="4"')
  expect(svg).toContain("Folded time (ns)")
  expect(svg).toMatchSvgSnapshot(import.meta.path, "adaptive-receiver-eye")
})

test("eye measurement gates and nonzero clock origins select only complete windows", () => {
  const gatedEye = {
    ...eye,
    time_origin_ms: 0.0000125,
    start_time_ms: 0.000055,
    end_time_ms: 0.00029,
  }
  const circuitJson: CircuitJson = [gatedEye, graph]
  const { windows } = getSimulationEyeDiagram({
    circuitJson,
    simulation_eye_diagram_id: eye.simulation_eye_diagram_id,
  })
  expect(windows).toHaveLength(3)
  expect(windows[0]![0]!.voltage).toBeCloseTo(3.3)
  const svg = convertCircuitJsonToSimulationEyeDiagramSvg({
    circuitJson,
    simulation_eye_diagram_id: eye.simulation_eye_diagram_id,
    width: 800,
    height: 480,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path, "gated-receiver-eye")
})

test("eye windows interpolate their boundaries without joining separate windows", () => {
  const linearGraph = {
    ...graph,
    timestamps_ms: [0, 0.00007, 0.00019, 0.0003],
    voltage_levels: [0, 0.7, 1.9, 3],
  }
  const { windows } = getSimulationEyeDiagram({
    circuitJson: [eye, linearGraph],
    simulation_eye_diagram_id: eye.simulation_eye_diagram_id,
  })
  expect(windows[0]![0]!.voltage).toBeCloseTo(0.25)
  expect(windows[0]!.at(-1)!.voltage).toBeCloseTo(1.25)
  expect(windows[1]![0]!.voltage).toBeCloseTo(0.75)
  expect(windows[1]!.at(-1)!.voltage).toBeCloseTo(1.75)
})

test("missing, ambiguous or invalid eye recordings fail explicitly", () => {
  for (const circuitJson of [
    [eye],
    [
      eye,
      graph,
      { ...graph, simulation_transient_voltage_graph_id: "duplicate" },
    ],
    [{ ...eye, unit_interval_ms: 0 }, graph],
    [{ ...eye, end_time_ms: 0.00006 }, graph],
    [eye, { ...graph, timestamps_ms: graph.timestamps_ms!.map(() => 0) }],
  ] satisfies CircuitJson[]) {
    expect(() =>
      getSimulationEyeDiagram({
        circuitJson,
        simulation_eye_diagram_id: eye.simulation_eye_diagram_id,
      }),
    ).toThrow()
  }
})

test("the selected eye is rendered alongside its schematic", async () => {
  const { circuit } = getTestFixture()
  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <resistor name="R1" resistance="10" footprint="0402" />
    </board>,
  )
  await circuit.renderUntilSettled()
  const svg = convertCircuitJsonToSchematicSimulationSvg({
    circuitJson: [...circuit.getCircuitJson(), eye, graph],
    simulation_experiment_id: "channel",
    simulation_eye_diagram_id: eye.simulation_eye_diagram_id,
    time_unit: "auto",
    width: 800,
    height: 800,
  })
  expect(svg).toContain('data-eye-window-count="4"')
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "schematic-with-receiver-eye",
  )
  expect(() =>
    convertCircuitJsonToSimulationGraphSvg({
      circuitJson: [eye, graph],
      simulation_experiment_id: "another_channel",
      simulation_eye_diagram_id: eye.simulation_eye_diagram_id,
    }),
  ).toThrow("does not belong")
})
