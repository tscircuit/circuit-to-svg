import { expect, test } from "bun:test"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Resvg } from "@resvg/resvg-js"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { type INode, parseSync, stringify } from "svgson"

const fontPath = join(
  dirname(fileURLToPath(import.meta.resolve("@tscircuit/alphabet/base64font"))),
  "TscircuitAlphabet.ttf",
)
const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  width: 14,
  height: 10,
  center: { x: 0, y: 0 },
  num_layers: 2,
  material: "fr4",
  thickness: 1.2,
}
const createText = (text: string, size = 1, x = -5): AnyCircuitElement => ({
  type: "pcb_silkscreen_text",
  pcb_silkscreen_text_id: `text-${x}`,
  pcb_component_id: "component",
  layer: "top",
  font: "tscircuit2024",
  font_size: size,
  anchor_position: { x, y: 4 },
  anchor_alignment: "top_left",
  ccw_rotation: 0,
  text,
})
const findText = (node: INode): INode | undefined => {
  if (
    node.name === "text" &&
    node.attributes["data-type"] === "pcb_silkscreen_text"
  )
    return node
  for (const child of node.children) {
    const found = findText(child)
    if (found) return found
  }
  return undefined
}

const measureVisibleRows = (text: string, size = 1) => {
  const svg = convertCircuitJsonToPcbSvg([board, createText(text, size)])
  const root = parseSync(svg)
  const node = findText(root)
  if (!node) throw new Error("Missing rendered silkscreen text")
  root.children = [node]
  const rendered = new Resvg(stringify(root), {
    font: {
      fontFiles: [fontPath],
      loadSystemFonts: false,
      defaultFontFamily: "TscircuitAlphabet",
    },
  }).render()
  const pixels = rendered.pixels
  const starts: number[] = []
  let previousRowHasInk = false
  for (let y = 0; y < rendered.height; y++) {
    let rowHasInk = false
    for (let x = 0; x < rendered.width; x++) {
      if ((pixels[(y * rendered.width + x) * 4 + 3] ?? 0) > 0) {
        rowHasInk = true
        break
      }
    }
    if (rowHasInk && !previousRowHasInk) starts.push(y)
    previousRowHasInk = rowHasInk
  }
  return { starts, fontPixels: Number(node.attributes["font-size"]) }
}

for (const [text, lineDistance, size] of [
  ["HI\n\nHI", 2, 1],
  ["HI\n\n\nHI", 3, 1],
  ["HI\n\nHI", 2, 1.5],
  ["HI\nHI", 1, 1],
] as const) {
  test(`visible rows preserve ${lineDistance} line advances at ${size}mm`, () => {
    const rendered = measureVisibleRows(text, size)
    expect(rendered.starts).toHaveLength(2)
    const first = rendered.starts[0]
    const second = rendered.starts[1]
    if (first === undefined || second === undefined)
      throw new Error("Missing ink rows")
    expect(
      Math.abs(second - first - lineDistance * rendered.fontPixels),
    ).toBeLessThanOrEqual(2)
  })
}

test("leading empty lines preserve the first visible row offset", () => {
  const regular = measureVisibleRows("HI")
  const leading = measureVisibleRows("\n\nHI")
  expect(regular.starts).toHaveLength(1)
  expect(leading.starts).toHaveLength(1)
  const first = regular.starts[0]
  const shifted = leading.starts[0]
  if (first === undefined || shifted === undefined)
    throw new Error("Missing ink row")
  expect(
    Math.abs(shifted - first - 2 * regular.fontPixels),
  ).toBeLessThanOrEqual(2)
})

test("trailing empty lines do not add visible ink", () => {
  expect(measureVisibleRows("HI\n\n").starts).toEqual(
    measureVisibleRows("HI").starts,
  )
})

test("renders single, repeated, and leading empty line spacing", () => {
  const elements = [
    board,
    ...["HI\nHI", "HI\n\nHI", "HI\n\n\nHI", "\n\nHI"].map((text, index) =>
      createText(text, 1, -5 + index * 3),
    ),
  ]
  expect(convertCircuitJsonToPcbSvg(elements)).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-empty-lines",
  )
})
