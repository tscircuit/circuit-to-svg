import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { getSchematicBoundsFromCircuitJson } from "lib/sch/get-schematic-bounds-from-circuit-json"
import type { SchematicTextWithSuperscript } from "lib/utils/net-label-superscript"
import { parseSync, type INode } from "svgson"
import { inlineNetLabelExamples } from "./inline-net-label-superscript.fixture"

const flatten = (node: INode): INode[] => [
  node,
  ...node.children.flatMap(flatten),
]
const label: SchematicTextWithSuperscript = {
  type: "schematic_text",
  schematic_text_id: "inline_gnd",
  text: "GND",
  source_trace_id: "source_trace_gnd",
  position: { x: 0, y: 0 },
  rotation: 0,
  anchor: "bottom_left",
  font_size: 0.18,
  color: "black",
  display_superscript: "1",
}

test("inline labels show superscripts beside horizontal and vertical wires", () => {
  const svg = convertCircuitJsonToSchematicSvg(inlineNetLabelExamples, {
    width: 1100,
    height: 720,
  })
  const suffixes = flatten(parseSync(svg)).filter(
    (n) => n.attributes.class === "sch-net-label-superscript",
  )
  expect(suffixes).toHaveLength(8)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("empty suffix preserves text rendering and suffix scales with font size", () => {
  const plain = { ...label, display_superscript: undefined }
  expect(convertCircuitJsonToSchematicSvg([plain])).toBe(
    convertCircuitJsonToSchematicSvg([
      { ...plain, ...{ display_superscript: "" } },
    ]),
  )
  for (const font_size of [0.18, 0.36]) {
    const nodes = flatten(
      parseSync(convertCircuitJsonToSchematicSvg([{ ...label, font_size }])),
    )
    const text = nodes.find((n) => n.attributes.class === "sch-text")!
    const suffix = nodes.find(
      (n) => n.attributes.class === "sch-net-label-superscript",
    )!
    expect(Number.parseFloat(suffix.attributes["font-size"]!)).toBeCloseTo(
      Number.parseFloat(text.attributes["font-size"]!) * 0.65,
    )
    expect(Number(suffix.attributes.dy)).toBeLessThan(0)
  }
})

test("multiline text appends a single escaped suffix to the final line", () => {
  const multiline = { ...label, text: "A\nGND", display_superscript: "<>&" }
  const nodes = flatten(
    parseSync(convertCircuitJsonToSchematicSvg([multiline])),
  )
  const text = nodes.find((n) => n.attributes.class === "sch-text")!
  expect(text.children[0]!.children).toHaveLength(1)
  const suffix = text.children[1]!.children[1]!
  expect(suffix.children[0]!.value).toBe("<>&")
  expect(
    nodes.filter((n) => n.attributes.class === "sch-net-label-superscript"),
  ).toHaveLength(1)
})

test("bounds include long suffixes and honor text anchoring and rotation", () => {
  for (const anchor of [
    "bottom_left",
    "bottom_center",
    "bottom_right",
  ] as const) {
    const short = { ...label, anchor }
    const long = { ...short, display_superscript: "123456789" }
    const before = getSchematicBoundsFromCircuitJson([short], 0)
    const after = getSchematicBoundsFromCircuitJson([long], 0)
    expect(after.maxX - after.minX).toBeGreaterThan(before.maxX - before.minX)
    if (anchor === "bottom_left") expect(after.minX).toBeCloseTo(0)
    if (anchor === "bottom_right") expect(after.maxX).toBeCloseTo(0)
    const rotated = getSchematicBoundsFromCircuitJson(
      [{ ...long, rotation: 90 }],
      0,
    )
    expect(rotated.maxY - rotated.minY).toBeCloseTo(after.maxX - after.minX)
  }
})
