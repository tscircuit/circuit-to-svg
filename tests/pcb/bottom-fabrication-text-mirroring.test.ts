import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync } from "svgson"
import { fromString } from "transformation-matrix"

test("bottom fabrication text mirrors around its anchor at every cardinal angle", async () => {
  const angles = [0, 90, 180, 270]
  const texts: AnyCircuitElement[] = ["top", "bottom"].flatMap((layer, row) =>
    angles.map((angle, column) => ({
      type: "pcb_fabrication_note_text" as const,
      pcb_fabrication_note_text_id: `${layer}_${angle}`,
      pcb_component_id: "component",
      layer: layer as "top" | "bottom",
      anchor_position: { x: -9 + column * 6, y: 4 - row * 8 },
      anchor_alignment: "center" as const,
      text: `${layer} R2 ${angle}`,
      font: "tscircuit2024" as const,
      font_size: 0.7,
      ccw_rotation: angle,
    })),
  )
  const svg = convertCircuitJsonToPcbSvg(
    [
      {
        type: "pcb_board",
        pcb_board_id: "board",
        width: 28,
        height: 18,
        center: { x: 0, y: 0 },
        num_layers: 2,
        material: "fr4",
        thickness: 1.6,
      },
      ...texts,
    ],
    { includeVersion: false },
  )
  await expect(svg).toMatchSvgSnapshot(import.meta.path)

  const renderedTexts = parseSync(svg).children.filter(
    (node) => node.attributes["data-type"] === "pcb_fabrication_note_text",
  )
  const topBaselineDirections = [
    [1, 0],
    [0, -1],
    [-1, 0],
    [0, 1],
  ]
  for (const [index, node] of renderedTexts.entries()) {
    const matrix = fromString(node.attributes.transform!)
    const [x, y] = topBaselineDirections[index % 4]!
    const direction = index < 4 ? 1 : -1
    expect(matrix.a).toBeCloseTo(x! * direction, 8)
    expect(matrix.b).toBeCloseTo(y! * direction, 8)
    expect(matrix.a * matrix.d - matrix.b * matrix.c).toBeCloseTo(direction, 8)
  }
})
