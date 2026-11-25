import { expect, test } from "bun:test"
import type { PcbBoard, PcbFabricationNoteText } from "circuit-json"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { renderFabricationText3dSnapshot } from "tests/fixtures/render-fabrication-text-3d-snapshot"
import { renderFabricationTextAnchorSnapshot } from "tests/fixtures/render-fabrication-text-anchor-snapshot"

const note: PcbFabricationNoteText = {
  type: "pcb_fabrication_note_text",
  pcb_fabrication_note_text_id: "bottom_note",
  pcb_component_id: "component",
  layer: "bottom",
  color: "#ffffff",
  text: "R2 bottom",
  font: "tscircuit2024",
  font_size: 1,
  anchor_position: { x: 0, y: 0 },
  anchor_alignment: "top_left",
  ccw_rotation: 0,
}

const board: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 16,
  height: 16,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

test("bottom fabrication text anchor snapshots show the input and reference point", async () => {
  for (const angle of [0, 90, 180, 270]) {
    const circuit = [{ ...note, ccw_rotation: angle }]
    await expect(
      renderFabricationTextAnchorSnapshot(circuit[0]!),
    ).toMatchSvgSnapshot(
      import.meta.path,
      `bottom-fabrication-text-anchor-bounds-${angle}`,
    )
    await expect(
      await renderFabricationText3dSnapshot([board, ...circuit]),
    ).toMatchSvgSnapshot(
      import.meta.path,
      `bottom-fabrication-text-anchor-bounds-${angle}-3d`,
    )
  }
})

test("bottom fabrication text bounds follow its mirrored anchor", () => {
  // Explicit PCB-space extents for this 5.4 mm by 1 mm label.
  // Each rotation must keep the same input anchor at the correct corner.
  for (const [angle, minX, minY, maxX, maxY] of [
    [0, -5.4, -1, 0, 0],
    [90, 0, -5.4, 1, 0],
    [180, 0, 0, 5.4, 1],
    [270, -1, 0, 0, 5.4],
  ] as const) {
    const bounds = getComprehensivePcbBounds([{ ...note, ccw_rotation: angle }])
    expect(bounds.minX).toBeCloseTo(minX, 8)
    expect(bounds.minY).toBeCloseTo(minY, 8)
    expect(bounds.maxX).toBeCloseTo(maxX, 8)
    expect(bounds.maxY).toBeCloseTo(maxY, 8)
  }
})
