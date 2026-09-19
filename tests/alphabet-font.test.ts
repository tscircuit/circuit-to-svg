import { expect, test } from "bun:test"
import base64Font from "@tscircuit/alphabet/base64font"
import {
  convertCircuitJsonToAssemblySvg,
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToPinoutSvg,
  convertCircuitJsonToSchematicSvg,
  convertCircuitJsonToStackedSchematicSheetsSvg,
  convertCircuitJsonToSolderPasteMask,
  convertCircuitJsonToSimulationGraphSvg,
  convertCircuitJsonToSchematicSimulationSvg,
} from "lib"
import type { AnyCircuitElement, PcbSilkscreenText } from "circuit-json"
import { parseSync, type INode } from "svgson"
import { stringifySvg } from "lib/utils/stringify-svg"

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  width: 20,
  height: 10,
  center: { x: 0, y: 0 },
  num_layers: 2,
  material: "fr4",
  thickness: 1.6,
}
const silkscreen: PcbSilkscreenText = {
  type: "pcb_silkscreen_text",
  pcb_silkscreen_text_id: "label",
  pcb_component_id: "component",
  layer: "top",
  font: "tscircuit2024",
  font_size: 1,
  anchor_position: { x: 0, y: 0 },
  anchor_alignment: "center",
  text: "R1 & <test>\nsecond line",
  ccw_rotation: 30,
}
const simulation = {
  circuitJson: [
    {
      type: "simulation_transient_voltage_graph" as const,
      simulation_transient_voltage_graph_id: "graph",
      simulation_experiment_id: "exp",
      start_time_ms: 0,
      end_time_ms: 1,
      time_per_step: 1,
      timestamps_ms: [0, 1],
      voltage_levels: [0, 1],
      name: "V(out)",
    },
  ],
  simulation_experiment_id: "exp",
}
const walk = (node: INode): INode[] => [node, ...node.children.flatMap(walk)]

function getPcbBoundaryAttributes(circuitJson: AnyCircuitElement[]) {
  const pcbBoundary = walk(
    parseSync(convertCircuitJsonToPcbSvg(circuitJson)),
  ).find((node) => node.attributes.class === "pcb-boundary")

  if (!pcbBoundary) throw new Error("Expected PCB boundary in rendered SVG")

  return pcbBoundary.attributes
}

for (const [name, render] of Object.entries({
  pcb: () => convertCircuitJsonToPcbSvg([board]),
  assembly: () => convertCircuitJsonToAssemblySvg([board]),
  pinout: () => convertCircuitJsonToPinoutSvg([board]),
  schematic: () => convertCircuitJsonToSchematicSvg([]),
  stacked: () =>
    convertCircuitJsonToStackedSchematicSheetsSvg(
      [0, 1].map(
        (index) =>
          ({
            type: "schematic_sheet",
            schematic_sheet_id: `sheet_${index}`,
            name: `Sheet ${index}`,
            sheet_index: index,
          }) as AnyCircuitElement,
      ),
    ),
  solderPaste: () =>
    convertCircuitJsonToSolderPasteMask([board], { layer: "top" }),
  simulation: () => convertCircuitJsonToSimulationGraphSvg(simulation),
  combined: () => convertCircuitJsonToSchematicSimulationSvg(simulation),
})) {
  test(`${name} SVG embeds one complete alphabet font`, () => {
    const svg = render()
    expect(svg.split("@font-face")).toHaveLength(2)
    expect(svg).toContain(`data:font/ttf;base64,${base64Font}`)
    expect(svg).toContain("format('truetype')")
  })
}

test("composing SVGs deduplicates fonts without modifying the input", () => {
  const nested = parseSync(convertCircuitJsonToPcbSvg([board]))
  const original = JSON.stringify(nested)
  const root = { ...nested, children: [nested, nested] }
  expect(stringifySvg(root).split("@font-face")).toHaveLength(2)
  expect(JSON.stringify(nested)).toBe(original)
})

test("silkscreen and fabrication notes retain text, transforms and font family", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    silkscreen,
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "note",
      pcb_component_id: "component",
      layer: "top",
      font: "tscircuit2024",
      font_size: 1,
      anchor_position: { x: 0, y: 2 },
      anchor_alignment: "top_left",
      text: "Fabrication & <notes>",
      ccw_rotation: 90,
    },
  ])
  const nodes = walk(parseSync(svg))
  const labels = nodes.filter((n) =>
    [
      "pcb-silkscreen-text pcb-silkscreen-top",
      "pcb-fabrication-note-text",
    ].includes(n.attributes.class ?? ""),
  )
  expect(labels).toHaveLength(2)
  for (const label of labels) {
    expect(label.name).toBe("text")
    expect(label.attributes["font-family"]).toBe("TscircuitAlphabet")
    expect(label.attributes.transform).toContain("matrix(")
  }
  expect(labels[0]!.children.filter((n) => n.name === "tspan")).toHaveLength(2)
  expect(walk(labels[1]!).find((n) => n.type === "text")?.value).toBe(
    "Fabrication & <notes>",
  )
  expect(nodes.some((n) => n.name === "image")).toBe(false)
})

test("silkscreen text visibility controls rendering", () => {
  const hiddenSilkscreen = {
    ...silkscreen,
    pcb_silkscreen_text_id: "hidden-label",
    text: "HIDDEN",
    is_hidden: true,
  } as PcbSilkscreenText & { is_hidden: boolean }
  const visibleSilkscreen = {
    ...silkscreen,
    pcb_silkscreen_text_id: "visible-label",
    text: "OMITTED",
  }
  const explicitlyVisibleSilkscreen = {
    ...silkscreen,
    pcb_silkscreen_text_id: "explicitly-visible-label",
    text: "FALSE",
    is_hidden: false,
  } as PcbSilkscreenText & { is_hidden: boolean }

  const svg = convertCircuitJsonToPcbSvg([
    board,
    hiddenSilkscreen,
    visibleSilkscreen,
    explicitlyVisibleSilkscreen,
  ])

  expect(svg).not.toContain("HIDDEN")
  expect(svg).toContain("OMITTED")
  expect(svg).toContain("FALSE")
})

test("silkscreen text visibility controls PCB bounds", () => {
  const outsideBoardSilkscreen = {
    ...silkscreen,
    anchor_position: { x: 1000, y: 1000 },
  }
  const hiddenSilkscreen = {
    ...outsideBoardSilkscreen,
    pcb_silkscreen_text_id: "hidden-label-outside-board",
    text: "HIDDEN",
    is_hidden: true,
  } as PcbSilkscreenText & { is_hidden: boolean }
  const explicitlyVisibleSilkscreen = {
    ...outsideBoardSilkscreen,
    pcb_silkscreen_text_id: "explicitly-visible-label-outside-board",
    text: "EXPLICITLY VISIBLE",
    is_hidden: false,
  } as PcbSilkscreenText & { is_hidden: boolean }
  const visibleSilkscreen = {
    ...outsideBoardSilkscreen,
    pcb_silkscreen_text_id: "visible-label-outside-board",
    text: "VISIBLE",
  }

  const baselineBoundary = getPcbBoundaryAttributes([board])
  const hiddenBoundary = getPcbBoundaryAttributes([board, hiddenSilkscreen])
  const explicitlyVisibleBoundary = getPcbBoundaryAttributes([
    board,
    explicitlyVisibleSilkscreen,
  ])
  const visibleBoundary = getPcbBoundaryAttributes([board, visibleSilkscreen])

  expect(hiddenBoundary).toEqual(baselineBoundary)
  expect(explicitlyVisibleBoundary).not.toEqual(baselineBoundary)
  expect(explicitlyVisibleBoundary).toEqual(visibleBoundary)
})

test("bottom knockout uses multiline font text inside its vector mask", () => {
  const nodes = walk(
    parseSync(
      convertCircuitJsonToPcbSvg(
        [
          board,
          {
            ...silkscreen,
            layer: "bottom",
            is_knockout: true,
            knockout_padding: { left: 0.1, right: 0.5, top: 0.2, bottom: 0.4 },
          },
        ],
        { layer: "bottom" },
      ),
    ),
  )
  const mask = nodes.find((n) => n.name === "mask")!
  expect(mask).toBeDefined()
  const text = walk(mask).find((n) => n.name === "text")!
  expect(text.attributes["font-family"]).toBe("TscircuitAlphabet")
  expect(text.children.filter((n) => n.name === "tspan")).toHaveLength(2)
  expect(walk(mask).some((n) => n.name === "path" || n.name === "image")).toBe(
    false,
  )
})

test("fabrication dimension labels use the embedded font", () => {
  const nodes = walk(
    parseSync(
      convertCircuitJsonToPcbSvg([
        board,
        {
          type: "pcb_fabrication_note_dimension",
          pcb_fabrication_note_dimension_id: "dim",
          pcb_component_id: "component",
          from: { x: -3, y: 0 },
          to: { x: 3, y: 0 },
          text: "6.00 mm",
          font: "tscircuit2024",
          font_size: 1,
          arrow_size: 0.5,
          layer: "top",
          offset_distance: 1,
          offset_direction: { x: 0, y: 1 },
        },
      ]),
    ),
  )
  const label = nodes.find(
    (n) => n.name === "text" && n.children.some((c) => c.value === "6.00 mm"),
  )!
  expect(label.attributes["font-family"]).toBe("TscircuitAlphabet")
})
