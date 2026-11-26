import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync } from "svgson"
import { fromString } from "transformation-matrix"
import { fabricationTextNotes } from "tests/fixtures/fabrication-text-board"

test.failing(
  "fabrication text preserves handedness and direction on both sides",
  () => {
    const baselineDirections = [
      [1, 0],
      [0, -1],
      [-1, 0],
      [0, 1],
    ]
    for (const layer of ["top", "bottom"] as const) {
      const svg = convertCircuitJsonToPcbSvg(
        fabricationTextNotes.map((note) => ({ ...note, layer })),
        { includeVersion: false },
      )
      const renderedTexts = parseSync(svg).children.filter(
        (node) => node.attributes["data-type"] === "pcb_fabrication_note_text",
      )
      expect(renderedTexts).toHaveLength(fabricationTextNotes.length)
      const handedness = layer === "top" ? 1 : -1
      for (const [index, node] of renderedTexts.entries()) {
        const matrix = fromString(node.attributes.transform!)
        const [x, y] = baselineDirections[index % 4]!
        expect(matrix.a).toBeCloseTo(x! * handedness, 8)
        expect(matrix.b).toBeCloseTo(y! * handedness, 8)
        expect(matrix.a * matrix.d - matrix.b * matrix.c).toBeCloseTo(
          handedness,
          8,
        )
        if (layer === "bottom") {
          // Looking from below reflects SVG X: (a, b) becomes (-a, b).
          const viewAngle =
            ((Math.atan2(-matrix.b, -matrix.a) * 180) / Math.PI + 360) % 360
          const expectedViewAngles = [0, 270, 180, 90]
          expect(viewAngle).toBeCloseTo(expectedViewAngles[index % 4]!, 8)
        }
      }
    }
  },
)
