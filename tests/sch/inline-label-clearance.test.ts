import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import type { AnyCircuitElement, SchematicText } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "lib/index"
import { createSvgSchText } from "lib/sch/svg-object-fns/create-svg-objects-for-sch-text"
import { colorMap } from "lib/utils/colors"
import { identity } from "transformation-matrix"
import {
  createLabelDetail,
  getLabelInkClearance,
} from "./inline-label-clearance-helpers"

const boards = [
  {
    name: "ti-drv8307evm",
    labelId: "schematic_inline_net_label_altium_31",
    detailLabelId: "schematic_inline_net_label_altium_55",
  },
  {
    name: "ti-tmds62levm-sheet55",
    labelId: "schematic_inline_net_label_altium_28",
    detailLabelId: "schematic_inline_net_label_altium_28",
  },
].map((board) => {
  const circuitJson = JSON.parse(
    gunzipSync(
      readFileSync(
        new URL(
          `./assets/inline-label-clearance/${board.name}.json.gz`,
          import.meta.url,
        ),
      ),
    ).toString("utf8"),
  ) as AnyCircuitElement[]
  const label = circuitJson.find(
    (element): element is SchematicText =>
      element.type === "schematic_text" &&
      element.schematic_text_id === board.labelId,
  )
  if (!label) throw new Error(`Missing source label in ${board.name}`)
  return { ...board, circuitJson, label }
})

test.each(boards)("snapshots the original $name schematic", (board) => {
  const original = structuredClone(board.circuitJson)
  const svg = convertCircuitJsonToSchematicSvg(board.circuitJson, {
    width: 1200,
    height: 900,
  })
  expect(board.circuitJson).toEqual(original)
  expect(svg).toMatchSvgSnapshot(import.meta.path, board.name)
  expect(createLabelDetail(svg, board.detailLabelId)).toMatchSvgSnapshot(
    import.meta.path,
    `${board.name}-detail`,
  )
})

test.failing.each(boards)(
  "keeps the original $name label clear of its wire",
  ({ label }) => {
    const ordinaryText = { ...label, source_trace_id: undefined }
    const clearance = getLabelInkClearance(label)
    // Compare actual ink using the same font, with a 40px normalized font size.
    expect(clearance).toBeGreaterThan(getLabelInkClearance(ordinaryText) + 3)
    expect(clearance).toBeGreaterThan(1)
  },
)

// These isolated orientation/font cases supplement the unchanged board fixtures.
for (const anchor of [
  "bottom_left",
  "bottom_right",
  "bottom_center",
  "bottom",
] as const) {
  for (const rotation of [0, -90]) {
    for (const font_size of [0.18, 0.36]) {
      test.failing(
        `adds visual clearance for ${anchor}, ${rotation}°, ${font_size}`,
        () => {
          const label = { ...boards[0]!.label, anchor, rotation, font_size }
          const ordinaryText = { ...label, source_trace_id: undefined }
          const clearance = getLabelInkClearance(label)
          expect(clearance).toBeGreaterThan(
            getLabelInkClearance(ordinaryText) + 3,
          )
          expect(clearance).toBeGreaterThan(1)
        },
      )
    }
  }
}

test("keeps the text anchor and rotation at the electrical attachment", () => {
  for (const { label } of boards) {
    const original = structuredClone(label)
    const rendered = createSvgSchText({
      elm: label,
      transform: identity(),
      colorMap,
    })
    expect(rendered.attributes.x).toBe(String(label.position.x))
    expect(rendered.attributes.y).toBe(String(label.position.y))
    expect(rendered.attributes.transform).toBe(
      `rotate(${label.rotation}, ${label.position.x}, ${label.position.y})`,
    )
    expect(label).toEqual(original)
  }
})

test("preserves ordinary text and legacy centered trace annotations", () => {
  for (const overrides of [
    { source_trace_id: undefined },
    { anchor: "center" as const },
    { anchor: "left" as const },
    { anchor: "right" as const },
    { anchor: "top_left" as const },
    { anchor: "top_center" as const },
    { anchor: "top_right" as const },
  ]) {
    const rendered = createSvgSchText({
      elm: { ...boards[0]!.label, ...overrides },
      transform: identity(),
      colorMap,
    })
    expect(rendered.attributes.dy).toBeUndefined()
  }
})
