import { expect, test } from "bun:test"
import { convertCircuitJsonToSimulationGraphSvg } from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"
import { estimateTextWidth } from "lib/sch/estimate-text-width"
import { parseSync } from "svgson"

// Labels captured from the DAC8560 demo; numerical samples are reduced to keep
// the regression small. The default 1200px viewport clips these ordinary labels.
const circuitJson: CircuitJsonWithSimulation[] = [
  {
    type: "simulation_experiment",
    simulation_experiment_id: "dac",
    name: "DAC8560 analog output and low-pass filter",
    experiment_type: "spice_transient_analysis",
  },
  ...["DAC output (behavioral)", "After 1k / 100nF filter"].map(
    (name, index): CircuitJsonWithSimulation => ({
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: `dac_${index}`,
      simulation_experiment_id: "dac",
      name,
      start_time_ms: 0,
      end_time_ms: 4,
      time_per_step: 1,
      voltage_levels: index === 0 ? [0, 2, 1, 2, 1] : [0, 1, 1.5, 1.5, 1.5],
    }),
  ),
]

test("default simulation SVG contains the full DAC legend", () => {
  const svg = convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: "dac",
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)

  const root = parseSync(svg)
  const legend = root.children.find(
    (node) => node.attributes.class === "legend",
  )!
  const canvasWidth = Number(root.attributes.width)
  for (const item of legend.children) {
    const originX = Number(
      item.attributes.transform!.match(/translate\((\S+)/)![1],
    )
    const text = item.children.find((node) => node.name === "text")!
    for (const line of text.children) {
      const label = line.children.map((node) => node.value).join("")
      const rightEdge = originX + 20 + estimateTextWidth(label) * 11
      expect(rightEdge).toBeLessThanOrEqual(canvasWidth - 10)
    }
  }
})
