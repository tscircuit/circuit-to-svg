import { expect, test } from "bun:test"
import { createGraphPoints } from "../../lib/sim/simulation-graph-svg/prepare-simulation-graphs/create-graph-points"

test("dense transient graphs are downsampled without losing extrema", () => {
  const sampleCount = 100_000
  const voltageLevels = Array.from({ length: sampleCount }, (_, sampleIndex) =>
    Math.sin(sampleIndex / 20),
  )
  voltageLevels[51_234] = 12
  voltageLevels[72_345] = -9

  const points = createGraphPoints({
    type: "simulation_transient_voltage_graph",
    simulation_transient_voltage_graph_id:
      "simulation_transient_voltage_graph_dense",
    simulation_experiment_id: "simulation_experiment_dense",
    name: "Dense switching trace",
    voltage_levels: voltageLevels,
    timestamps_ms: Array.from(
      { length: sampleCount },
      (_, sampleIndex) => sampleIndex * 0.000_005,
    ),
    start_time_ms: 0,
    end_time_ms: (sampleCount - 1) * 0.000_005,
    time_per_step: 0.000_005,
  })

  expect(points.length).toBeLessThanOrEqual(4_000)
  expect(points.some(({ rawValue }) => rawValue === 12)).toBe(true)
  expect(points.some(({ rawValue }) => rawValue === -9)).toBe(true)
  expect(points[0]?.timeMs).toBe(0)
  expect(points.at(-1)?.timeMs).toBe((sampleCount - 1) * 0.000_005)
  expect(
    points.every(
      (point, pointIndex) =>
        pointIndex === 0 ||
        point.timeMs >
          (points[pointIndex - 1]?.timeMs ?? Number.NEGATIVE_INFINITY),
    ),
  ).toBe(true)
})
