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
const experimentId = "legend-height"
const createSvg = (count: number, name = "HI", height = 600) => {
  const circuitJson: CircuitJsonWithSimulation[] = [
    {
      type: "simulation_experiment",
      simulation_experiment_id: experimentId,
      name: "All channels remain visible",
      experiment_type: "spice_transient_analysis",
    },
    ...Array.from({ length: count }, (_, index) => ({
      type: "simulation_transient_voltage_graph" as const,
      simulation_transient_voltage_graph_id: `graph-${index}`,
      simulation_experiment_id: experimentId,
      start_time_ms: 0,
      end_time_ms: 1,
      time_per_step: 1,
      timestamps_ms: [0, 1],
      voltage_levels: [index, index + 1],
      name,
    })),
  ]
  return convertCircuitJsonToSimulationGraphSvg({
    circuitJson,
    simulation_experiment_id: experimentId,
    height,
  })
}
const findClass = (node: INode, className: string): INode | undefined => {
  if (node.attributes.class === className) return node
  for (const child of node.children) {
    const found = findClass(child, className)
    if (found) return found
  }
  return undefined
}
const countVisibleRows = (svg: string) => {
  const root = parseSync(svg)
  const legend = findClass(root, "legend")
  if (!legend) throw new Error("Missing legend")
  for (const item of legend.children) {
    item.children = item.children.filter((child) => child.name === "text")
  }
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
  const pixels = rendered.pixels
  let rows = 0
  let previousInk = false
  for (let y = 0; y < rendered.height; y++) {
    let ink = false
    for (let x = 0; x < rendered.width; x++) {
      if ((pixels[(y * rendered.width + x) * 4 + 3] ?? 0) > 0) {
        ink = true
        break
      }
    }
    if (ink && !previousInk) rows++
    previousInk = ink
  }
  return rows
}
test("keeps all 25 normal channel legend labels visible", () => {
  expect(countVisibleRows(createSvg(25))).toBe(25)
})
test("accounts for each wrapped legend row", () => {
  expect(countVisibleRows(createSvg(18, "HIHIHIHIHIHIHI_HIHIHIHIHIHIHI"))).toBe(
    36,
  )
})
test("keeps a short legend at the requested height", () => {
  const root = parseSync(createSvg(2))
  expect(root.attributes.height).toBe("600")
  expect(countVisibleRows(stringify(root))).toBe(2)
})
test("keeps the plot geometry when a short canvas needs more legend space", () => {
  const short = parseSync(createSvg(2, "HI", 180))
  const tall = parseSync(createSvg(8, "HI", 180))
  const findClipRect = (root: INode) =>
    root.children
      .find((node) => node.name === "defs")
      ?.children.find((node) => node.name === "clipPath")?.children[0]
      ?.attributes
  const shortClipRect = findClipRect(short)
  const tallClipRect = findClipRect(tall)
  expect(shortClipRect).toBeDefined()
  expect(tallClipRect).toBeDefined()
  expect(tallClipRect).toEqual(shortClipRect)
  expect(countVisibleRows(stringify(tall))).toBe(8)
})
test("shows all labels beside the unchanged plot", () => {
  expect(createSvg(25)).toMatchSvgSnapshot(
    import.meta.path,
    "simulation-legend-height",
  )
})
