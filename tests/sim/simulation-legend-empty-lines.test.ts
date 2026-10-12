import { expect, test } from "bun:test"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToSimulationGraphSvg } from "lib"
import type { CircuitJsonWithSimulation } from "lib/sim/types"
import { type INode, parseSync, stringify } from "svgson"

const fontPath = join(
  dirname(fileURLToPath(import.meta.resolve("@tscircuit/alphabet/base64font"))),
  "TscircuitAlphabet.ttf",
)
const experimentId = "legend-empty-lines"
const createSvg = (separator: string, groups = 2) => {
  const circuitJson: CircuitJsonWithSimulation[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: experimentId,
      name: "Legend spacing",
      experiment_type: "spice_transient_analysis",
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "graph",
      simulation_experiment_id: experimentId,
      start_time_ms: 0,
      end_time_ms: 1,
      time_per_step: 1,
      timestamps_ms: [0, 1],
      voltage_levels: [0, 1],
      name: `V(${Array(groups).fill("HIHIHIHIHIHIHIHI").join(separator)})`,
    },
  ]
  return convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: experimentId,
  })
}
const findLegend = (node: INode): INode | undefined => {
  if (node.attributes.class === "legend-item") return node
  for (const child of node.children) {
    const found = findLegend(child)
    if (found) return found
  }
  return undefined
}
const measureRows = (svg: string) => {
  const root = parseSync(svg)
  const legend = findLegend(root)
  if (!legend) throw new Error("Missing public legend")
  legend.children = legend.children.filter((child) => child.name === "text")
  root.children = [
    ...root.children.filter((child) => child.name === "style"),
    legend,
  ]
  const rendered = new Resvg(stringify(root), {
    font: {
      fontFiles: [fontPath],
      loadSystemFonts: false,
      defaultFontFamily: "TscircuitAlphabet",
    },
  }).render()
  const starts: number[] = []
  const pixels = rendered.pixels
  let previous = false
  for (let y = 0; y < rendered.height; y++) {
    let ink = false
    for (let x = 0; x < rendered.width; x++) {
      if ((pixels[(y * rendered.width + x) * 4 + 3] ?? 0) > 0) {
        ink = true
        break
      }
    }
    if (ink && !previous) starts.push(y)
    previous = ink
  }
  return starts
}
for (const [separator, distance] of [
  ["_", 16],
  ["__", 32],
] as const) {
  test(`public legend preserves ${distance}px line placement`, () => {
    const rows = measureRows(createSvg(separator))
    expect(rows).toHaveLength(2)
    const first = rows[0]
    const second = rows[1]
    if (first === undefined || second === undefined)
      throw new Error("Missing rows")
    expect(Math.abs(second - first - distance)).toBeLessThanOrEqual(2)
  })
}
test("multiple empty wrapped lines preserve each visible row", () => {
  const rows = measureRows(createSvg("__", 3))
  expect(rows).toHaveLength(3)
  for (let index = 1; index < rows.length; index++) {
    const previous = rows[index - 1]
    const current = rows[index]
    if (previous === undefined || current === undefined)
      throw new Error("Missing rows")
    expect(Math.abs(current - previous - 32)).toBeLessThanOrEqual(2)
  }
})
const createLegendSnapshot = (svg: string) => {
  const root = parseSync(svg)
  const legend = findLegend(root)
  if (!legend) throw new Error("Missing public legend")
  root.attributes.width = "240"
  root.attributes.height = "90"
  root.attributes.viewBox = "0 0 240 90"
  legend.attributes.transform = "translate(10 25)"
  root.children = [
    ...root.children.filter((child) => child.name === "style"),
    {
      type: "element",
      name: "rect",
      value: "",
      attributes: { width: "240", height: "90", fill: "white" },
      children: [],
    },
    legend,
  ]
  return stringify(root)
}
test("shows the empty wrapped line in the simulation legend", () => {
  expect(createLegendSnapshot(createSvg("__"))).toMatchSvgSnapshot(
    import.meta.path,
    "simulation-legend-empty-lines",
  )
})
