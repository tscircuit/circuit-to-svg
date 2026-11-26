import { expect, test } from "bun:test"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { fabricationTextNotes } from "tests/fixtures/fabrication-text-rotation-board"

test.failing(
  "bottom fabrication text bounds follow its mirrored anchor",
  () => {
    // Explicit PCB-space extents for this 5.4 mm by 1 mm label.
    // Each rotation must keep the input anchor at the correct corner.
    for (const [angle, minX, minY, maxX, maxY] of [
      [0, -5.4, -1, 0, 0],
      [90, 0, -5.4, 1, 0],
      [180, 0, 0, 5.4, 1],
      [270, -1, 0, 0, 5.4],
    ] as const) {
      const note = fabricationTextNotes.find(
        (note) =>
          note.anchor_alignment === "top_left" && note.ccw_rotation === angle,
      )!
      const bounds = getComprehensivePcbBounds([note])
      expect(bounds.minX - note.anchor_position.x).toBeCloseTo(minX, 8)
      expect(bounds.minY - note.anchor_position.y).toBeCloseTo(minY, 8)
      expect(bounds.maxX - note.anchor_position.x).toBeCloseTo(maxX, 8)
      expect(bounds.maxY - note.anchor_position.y).toBeCloseTo(maxY, 8)
    }
  },
)
