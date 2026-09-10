import { expect, test } from "bun:test"
import { convertCircuitJsonToSimulationGraphSvg } from "lib"
import { formatTickLabel } from "lib/sim/simulation-graph-svg/format-value-with-unit"
import type { AxisInfo } from "lib/sim/simulation-graph-svg/simulation-graph-svg-shared"
import type { CircuitJsonWithSimulation } from "lib/sim/types"
import { parseSync } from "svgson"

test.each([1e-4, 1e-6, 1e-9])(
  "simulation tick labels preserve values spaced %s apart",
  (step) => {
    const ticks = [-2 * step, -step, 0, step, 2 * step]
    const axis: AxisInfo = { domainMin: ticks[0]!, domainMax: ticks[4]!, ticks }
    const labels = ticks.map((tick) => formatTickLabel(tick, axis))
    expect(new Set(labels).size).toBe(ticks.length)
    labels.forEach((label, index) => {
      expect(Number(label)).toBeCloseTo(ticks[index]!, 14)
    })
    expect(labels[2]).toBe("0")
  },
)

test("small tick spacing preserves a nonzero baseline", () => {
  const ticks = [0.000010001, 0.000010002, 0.000010003]
  const axis: AxisInfo = { domainMin: ticks[0]!, domainMax: ticks[2]!, ticks }
  expect(ticks.map((value) => Number(formatTickLabel(value, axis)))).toEqual(
    ticks,
  )
})

test("renders readable nanoamp current-axis labels", () => {
  const circuitJson: CircuitJsonWithSimulation[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: "small-current",
      name: "Nanoamp current measurement",
      experiment_type: "spice_transient_analysis",
    },
    {
      type: "simulation_transient_current_graph",
      simulation_transient_current_graph_id: "current",
      simulation_experiment_id: "small-current",
      start_time_ms: 0,
      end_time_ms: 4,
      time_per_step: 1,
      current_levels: [-2e-9, -1e-9, 0, 1e-9, 2e-9],
      name: "I(sensor)",
    },
  ]
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: "small-current",
  })
  const axes = parseSync(svg).children.find(
    (node) => node.attributes.class === "axes",
  )!
  const labels = axes.children
    .filter((node) => node.attributes.class === "axis-label axis-label-y")
    .map((node) => node.children[0]!.value)
  expect(labels.length).toBeGreaterThan(2)
  expect(new Set(labels).size).toBe(labels.length)
  expect(labels.map(Number)).toContain(-2e-9)
  expect(labels.map(Number)).toContain(2e-9)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
