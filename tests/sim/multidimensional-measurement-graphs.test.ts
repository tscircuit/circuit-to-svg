import { expect, test } from "bun:test"
import { convertCircuitJsonToSimulationGraphSvg } from "lib/sim/convert-circuit-json-to-simulation-graph-svg"
import {
  multidimensionalMeasurementCircuitJson,
  multidimensionalTransientCircuitJson,
  oneDimensionalMeasurementCircuitJson,
} from "tests/fixtures/multidimensional-measurement-results"

test("renders a one-dimensional scalar measurement sweep", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: oneDimensionalMeasurementCircuitJson,
    simulation_experiment_id: "simulation_experiment_frequency",
  })

  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "measurement-sweep-one-dimensional",
  )
})

test("renders multidimensional scalar measurements as grouped sweep curves", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: multidimensionalMeasurementCircuitJson,
    simulation_experiment_id: "simulation_experiment_efficiency",
  })

  expect(svg).not.toContain("Raw VOUT")
  expect(svg).toContain("1.8V")
  expect(svg).not.toContain("236600Ω")
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "measurement-sweep-multidimensional",
  )
})

test("accepts explicit axes and series colors for measurement graphs", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: multidimensionalMeasurementCircuitJson,
    simulation_experiment_id: "simulation_experiment_efficiency",
    series_colors: ["#111111", "#ff1f1f", "#b7b7b7"],
    x_axis_min: 0.001,
    x_axis_max: 1,
    y_axis_min: 60,
    y_axis_max: 100,
    y_axis_tick_values: [60, 70, 80, 90, 100],
  })

  expect(svg).toContain('stroke="#111111"')
  expect(svg).toContain('stroke="#ff1f1f"')
  expect(svg).toContain('stroke="#b7b7b7"')
  expect(svg.match(/grid-line-x/g)).toHaveLength(28)
  expect(svg.match(/grid-line-y/g)).toHaveLength(5)
})

test("rejects nonpositive logarithmic axis bounds", () => {
  expect(() =>
    convertCircuitJsonToSimulationGraphSvg({
      circuitJson: oneDimensionalMeasurementCircuitJson,
      simulation_experiment_id: "simulation_experiment_frequency",
      x_axis_min: 0,
    }),
  ).toThrow("Logarithmic X-axis values must be positive")
})

test("labels transient graphs with every parameter sweep coordinate", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson: multidimensionalTransientCircuitJson,
    simulation_experiment_id:
      "simulation_experiment_multidimensional_transient",
  })

  expect(svg).toContain("VOUT (100Ω, 0.000001F)")
  expect(svg).toContain("VOUT (200Ω, 0.000002F)")
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "transient-sweep-multidimensional",
  )
})
