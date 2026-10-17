import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync, type INode } from "svgson"
import type { AnyCircuitElement, NinePointAnchor } from "circuit-json"

// tscircuit/tscircuit#5542: the SVG silkscreen text renderer must place the
// reference advance box (height 0.7 x font_size, as drawn by
// circuit-json-to-gerber) on the anchor. The TTF's alphabetic baseline is the
// reference stroke baseline, so the baseline sits 0.7 x font_size below the
// box top: top rows -> y = 0.7F, center rows -> y = 0.35F, bottom rows -> y = 0.

const ALIGNMENTS: { alignment: NinePointAnchor; x: number; y: number }[] = [
  { alignment: "top_left", x: -7, y: 5 },
  { alignment: "top_center", x: 0, y: 5 },
  { alignment: "top_right", x: 7, y: 5 },
  { alignment: "center_left", x: -7, y: 0 },
  { alignment: "center", x: 0, y: 0 },
  { alignment: "center_right", x: 7, y: 0 },
  { alignment: "bottom_left", x: -7, y: -5 },
  { alignment: "bottom_center", x: 0, y: -5 },
  { alignment: "bottom_right", x: 7, y: -5 },
]

const BOX_TOP_OFFSET_RATIO: Record<string, number> = {
  top: 0,
  center: -0.35,
  bottom: -0.7,
}
const ADVANCE_BOX_HEIGHT_RATIO = 0.7
const LINE_PITCH_RATIO = 1.152

function makeSilkscreenText(
  id: string,
  alignment: NinePointAnchor,
  anchor_position: { x: number; y: number },
  text = "Q1",
): AnyCircuitElement {
  return {
    type: "pcb_silkscreen_text",
    layer: "top",
    pcb_silkscreen_text_id: id,
    font: "tscircuit2024",
    font_size: 1.7,
    pcb_component_id: "pcb_generic_component_0",
    anchor_position,
    anchor_alignment: alignment,
    text,
  } as AnyCircuitElement
}

const board: AnyCircuitElement = {
  type: "pcb_board",
  width: 24,
  height: 18,
  center: { x: 0, y: 0 },
  num_layers: 2,
  pcb_board_id: "pcb_board_0",
  thickness: 1.2,
  material: "fr1",
}

function findSilkscreenTextNodes(svg: string): Map<string, INode> {
  const root = parseSync(svg)
  const found = new Map<string, INode>()
  const walk = (node: INode) => {
    const cls: string = node.attributes?.class ?? ""
    if (
      node.name === "text" &&
      cls.includes("pcb-silkscreen-text") &&
      !cls.includes("knockout")
    ) {
      const id = node.attributes["data-pcb-silkscreen-text-id"]
      if (id) found.set(id, node)
    }
    for (const child of node.children ?? []) walk(child as INode)
  }
  walk(root)
  return found
}

test("silkscreen text baseline aligns the reference advance box (#5542)", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    ...ALIGNMENTS.map((a, i) =>
      makeSilkscreenText(`text_${a.alignment}`, a.alignment, {
        x: a.x,
        y: a.y,
      }),
    ),
  ])

  const nodes = findSilkscreenTextNodes(svg)
  expect(nodes.size).toBe(9)

  for (const { alignment } of ALIGNMENTS) {
    const node = nodes.get(`text_${alignment}`)
    expect(node).toBeDefined()
    const fontSize = Number(node!.attributes["font-size"])
    const row = alignment.split("_")[0]!
    const expectedBaselineY =
      (BOX_TOP_OFFSET_RATIO[row]! + ADVANCE_BOX_HEIGHT_RATIO) * fontSize

    expect(node!.attributes["dominant-baseline"]).toBe("alphabetic")
    expect(Number(node!.attributes.y)).toBeCloseTo(expectedBaselineY, 6)
  }

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("silkscreen text multi-line pitch matches the core solver (#5542)", () => {
  const svg = convertCircuitJsonToPcbSvg([
    board,
    makeSilkscreenText("multiline", "center", { x: 0, y: 0 }, "Q1\nQ2"),
  ])

  const nodes = findSilkscreenTextNodes(svg)
  const node = nodes.get("multiline")
  expect(node).toBeDefined()

  const fontSize = Number(node!.attributes["font-size"])
  // First line's baseline follows the same advance-box formula (center row)
  expect(Number(node!.attributes.y)).toBeCloseTo(0.35 * fontSize, 6)
  expect(node!.attributes["dominant-baseline"]).toBe("alphabetic")

  const tspans = (node!.children as INode[]).filter((c) => c.name === "tspan")
  expect(tspans.length).toBe(2)
  expect(tspans[0]!.attributes.dy).toBeUndefined()
  expect(Number(tspans[1]!.attributes.dy)).toBeCloseTo(
    LINE_PITCH_RATIO * fontSize,
    6,
  )
})
