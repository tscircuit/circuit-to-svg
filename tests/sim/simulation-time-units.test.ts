import { expect, test } from "bun:test"
import type { CircuitJsonWithSimulation } from "lib/sim/types"
import { convertCircuitJsonToSimulationGraphSvg } from "lib"

function createTransientCircuitJson(
  durationMs: number,
): CircuitJsonWithSimulation[] {
  return [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "fast_channel",
      experiment_type: "spice_transient_analysis",
      name: "CMOS channel",
      start_time_ms: 0,
      end_time_ms: durationMs,
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "receiver",
      simulation_experiment_id: "fast_channel",
      name: "DATA_RX",
      start_time_ms: 0,
      end_time_ms: durationMs,
      time_per_step: durationMs / 4,
      timestamps_ms: [
        0,
        durationMs / 4,
        durationMs / 2,
        (durationMs * 3) / 4,
        durationMs,
      ],
      voltage_levels: [0, 3.3, 3.3, 0, 0],
    },
  ]
}

for (const { durationMs, unit, snapshotName } of [
  {
    durationMs: 0.0004,
    unit: "ns",
    snapshotName: "simulation-time-nanoseconds",
  },
  { durationMs: 0.4, unit: "µs", snapshotName: "simulation-time-microseconds" },
  { durationMs: 4, unit: "ms", snapshotName: "simulation-time-milliseconds" },
  { durationMs: 4000, unit: "s", snapshotName: "simulation-time-seconds" },
  {
    durationMs: 0.0000004,
    unit: "ps",
    snapshotName: "simulation-time-picoseconds",
  },
]) {
  test(`transient time labels automatically use ${unit} without changing timestamps`, () => {
    const circuitJson = createTransientCircuitJson(durationMs)
    const originalCircuitJson = JSON.stringify(circuitJson)
    const svg = convertCircuitJsonToSimulationGraphSvg({
      circuitJson,
      simulation_experiment_id: "fast_channel",
      time_unit: "auto",
      width: 800,
      height: 480,
    })
    expect(svg).toContain(`Time (${unit})`)
    expect(JSON.stringify(circuitJson)).toBe(originalCircuitJson)
    expect(svg).toMatchSvgSnapshot(import.meta.path, snapshotName)
  })
}

test("explicit milliseconds retain distinct sub-microsecond tick labels", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: createTransientCircuitJson(0.0004),
    simulation_experiment_id: "fast_channel",
    width: 800,
    height: 480,
  })
  expect(svg).toContain("Time (ms)")
  expect(svg).toContain(">0.0001<")
  expect(svg).toContain(">0.0002<")
  expect(svg).toContain(">0.0003<")
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "simulation-time-explicit-milliseconds",
  )
})
