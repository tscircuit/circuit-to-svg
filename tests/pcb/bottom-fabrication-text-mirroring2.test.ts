import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync } from "svgson"
import { compose, fromString, scale, translate } from "transformation-matrix"
import nativeReference from "tests/fixtures/kicad-fabrication-reference.json"
import {
  fabricationTextBoard,
  fabricationTextNotes,
} from "tests/fixtures/fabrication-text-board"

test("fabrication text matches independent native KiCad glyph directions", () => {
  for (const layer of ["top", "bottom"] as const) {
    const svg = convertCircuitJsonToPcbSvg(
      [
        fabricationTextBoard,
        ...fabricationTextNotes.map((note) => ({ ...note, layer })),
      ],
      {
        includeVersion: false,
        width: 1800,
        matchBoardAspectRatio: true,
        drawPaddingOutsideBoard: false,
        viewport: { minX: -50, minY: -32, maxX: 50, maxY: 32 },
      },
    )
    const renderedTexts = parseSync(svg).children.filter(
      (node) => node.attributes["data-type"] === "pcb_fabrication_note_text",
    )
    expect(renderedTexts).toHaveLength(fabricationTextNotes.length)
    const handedness = layer === "top" ? 1 : -1
    for (const [index, node] of renderedTexts.entries()) {
      const matrix = fromString(node.attributes.transform!)
      const anchor = fabricationTextNotes[index]!.anchor_position
      expect(matrix.e).toBeCloseTo((anchor.x + 50) * 18, 8)
      expect(matrix.f).toBeCloseTo((32 - anchor.y) * 18, 8)
      const expected =
        nativeReference.views[layer === "top" ? "top" : "bottom_from_top"][
          index % 4
        ]!
      for (const [i, field] of (["a", "b", "c", "d"] as const).entries()) {
        expect(matrix[field]).toBeCloseTo(expected[i]!, 8)
      }
      expect(matrix.a * matrix.d - matrix.b * matrix.c).toBeCloseTo(
        handedness,
        8,
      )
      if (layer === "bottom") {
        const viewMatrix = compose(translate(1800, 0), scale(-1, 1), matrix)
        expect(viewMatrix.e).toBeCloseTo((50 - anchor.x) * 18, 8)
        expect(viewMatrix.f).toBeCloseTo((32 - anchor.y) * 18, 8)
        const expectedView = nativeReference.views.bottom[index % 4]!
        for (const [i, field] of (["a", "b", "c", "d"] as const).entries()) {
          expect(viewMatrix[field]).toBeCloseTo(expectedView[i]!, 8)
        }
      }
    }
  }
})
