import { expect, test } from "bun:test"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Resvg } from "@resvg/resvg-js"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib"
import { type INode, parseSync, stringify } from "svgson"

const fontPath = join(
  dirname(fileURLToPath(import.meta.resolve("@tscircuit/alphabet/base64font"))),
  "TscircuitAlphabet.ttf",
)
type TextKind = "plain" | "parts"
const sheet: AnyCircuitElement = {
  type: "schematic_sheet",
  schematic_sheet_id: "sheet",
}
const createText = (
  text: string,
  size = 1,
  x = -5,
  kind: TextKind = "plain",
): AnyCircuitElement => ({
  type: "schematic_text",
  schematic_text_id: `text-${x}`,
  schematic_sheet_id: "sheet",
  schematic_component_id: "",
  position: { x, y: 4 },
  anchor: "top_left",
  rotation: 0,
  font_size: size,
  color: "rgb(0, 100, 100)",
  text,
  ...(kind === "parts" ? { text_parts: [{ text, is_overlined: false }] } : {}),
})
const findText = (node: INode): INode | undefined => {
  if (
    node.name === "text" &&
    node.attributes["data-schematic-text-id"] !== undefined
  )
    return node
  for (const child of node.children) {
    const found = findText(child)
    if (found) return found
  }
  return undefined
}

const measureVisibleRows = (text: string, size: number, kind: TextKind) => {
  const svg = convertCircuitJsonToSchematicSvg([
    sheet,
    createText(text, size, -5, kind),
  ])
  const root = parseSync(svg)
  const node = findText(root)
  if (!node) throw new Error("Missing rendered schematic text")
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
  return {
    starts: starts.map((row) => row - Number(node.attributes.y)),
    fontPixels: Number.parseFloat(node.attributes["font-size"] ?? ""),
  }
}

for (const kind of ["plain", "parts"] as const) {
  for (const [text, lineDistance, size] of [
    ["HI\n\nHI", 2, 1],
    ["HI\n\n\nHI", 3, 1],
    ["HI\n\nHI", 2, 1.5],
    ["HI\nHI", 1, 1],
  ] as const) {
    test(`${kind}: visible rows preserve ${lineDistance} line advances at ${size}mm`, () => {
      const rendered = measureVisibleRows(text, size, kind)
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

  test(`${kind}: leading empty lines advance the first row from a multiline control`, () => {
    const regular = measureVisibleRows("HI\n", 1, kind)
    const leading = measureVisibleRows("\n\nHI", 1, kind)
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

  test(`${kind}: trailing empty lines do not add visible ink`, () => {
    const regular = measureVisibleRows("HI\n", 1, kind)
    const trailing = measureVisibleRows("HI\n\n", 1, kind)
    expect(regular.starts).toHaveLength(1)
    expect(trailing.starts).toHaveLength(1)
    const first = regular.starts[0]
    const last = trailing.starts[0]
    if (first === undefined || last === undefined)
      throw new Error("Missing ink row")
    expect(Math.abs(first - last)).toBeLessThanOrEqual(2)
  })

  test(`${kind}: renders single, repeated, and leading empty line spacing`, () => {
    const elements = [
      sheet,
      ...["HI\nHI", "HI\n\nHI", "HI\n\n\nHI", "\n\nHI"].map((text, index) =>
        createText(text, 1, -5 + index * 3, kind),
      ),
    ]
    expect(convertCircuitJsonToSchematicSvg(elements)).toMatchSvgSnapshot(
      import.meta.path,
      `schematic-empty-lines-${kind}`,
    )
  })
}

test("preserves overlined parts and a superscript with repeated empty lines", () => {
  const element = createText("HI\n\nHI", 1, -5, "parts")
  if (element.type !== "schematic_text")
    throw new Error("Missing schematic text")
  element.display_superscript = "1"
  element.text_parts = [
    { text: "HI\n\n", is_overlined: true },
    { text: "HI", is_overlined: false },
  ]
  expect(convertCircuitJsonToSchematicSvg([sheet, element])).toMatchSvgSnapshot(
    import.meta.path,
    "schematic-empty-lines-overlined",
  )
})
