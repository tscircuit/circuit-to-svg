import { expect, test } from "bun:test"
import { getSchematicBoundsFromCircuitJson } from "lib/sch/get-schematic-bounds-from-circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import {
  getNetLabelTextWidth,
  type NetLabelWithSuperscript,
} from "lib/utils/net-label-superscript"
import { parseSync, type INode } from "svgson"

export const superscriptLabels: NetLabelWithSuperscript[] = []
for (const [row, style] of [
  "left",
  "right",
  "top",
  "bottom",
  "ground_down",
  "vcc_up",
].entries()) {
  for (const [column, superscript] of [undefined, "1", "2", "12"].entries()) {
    const position = { x: column * 2, y: -row * 1.5 }
    superscriptLabels.push({
      type: "schematic_net_label",
      schematic_net_label_id: `label_${row}_${column}`,
      source_net_id: `net_${row}_${column}`,
      text: style === "vcc_up" ? "VCC" : "GND",
      display_superscript: superscript,
      center: position,
      anchor_position: position,
      anchor_side:
        row < 4 ? (style as "left" | "right" | "top" | "bottom") : "left",
      ...(row >= 4 ? { symbol_name: style } : {}),
    })
  }
}

const flatten = (node: INode): INode[] => [
  node,
  ...node.children.flatMap(flatten),
]

test("superscripts on outlined labels in every orientation and ground/power symbols", () => {
  const svg = convertCircuitJsonToSchematicSvg(superscriptLabels, {
    width: 1000,
    height: 1000,
  })
  const spans = flatten(parseSync(svg)).filter(
    (n) => n.attributes.class === "sch-net-label-superscript",
  )
  expect(spans).toHaveLength(18)
  expect(spans.every((n) => Number(n.attributes.dy) < 0)).toBe(true)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("empty suffix preserves output and multi-character suffix increases label width", () => {
  const label = superscriptLabels[0]!
  expect(convertCircuitJsonToSchematicSvg([label])).toBe(
    convertCircuitJsonToSchematicSvg([{ ...label, display_superscript: "" }]),
  )
  expect(
    getNetLabelTextWidth({ ...label, display_superscript: "12" }),
  ).toBeGreaterThan(
    getNetLabelTextWidth({ ...label, display_superscript: "1" }),
  )
})

test("superscript text is escaped", () => {
  const svg = convertCircuitJsonToSchematicSvg([
    { ...superscriptLabels[0]!, display_superscript: "<>&" },
  ])
  expect(svg).not.toContain("><>&</tspan>")
  const span = flatten(parseSync(svg)).find((n) => n.name === "tspan")!
  expect(span.children[0]!.value).toBe("<>&")
})

test("auto-fit bounds grow for a suffix, including labels positioned by center", () => {
  for (const anchor_side of ["left", "right", "top", "bottom"] as const) {
    const label = {
      ...superscriptLabels[0]!,
      anchor_side,
      anchor_position: undefined,
    }
    const before = getSchematicBoundsFromCircuitJson([label], 0)
    const after = getSchematicBoundsFromCircuitJson(
      [{ ...label, display_superscript: "123" }],
      0,
    )
    if (anchor_side === "left" || anchor_side === "right") {
      expect(after.maxX - after.minX).toBeGreaterThan(before.maxX - before.minX)
    } else {
      expect(after.maxY - after.minY).toBeGreaterThan(before.maxY - before.minY)
    }
    expect(
      convertCircuitJsonToSchematicSvg([
        { ...label, display_superscript: "123" },
      ]),
    ).not.toContain("NaN")
  }
})
