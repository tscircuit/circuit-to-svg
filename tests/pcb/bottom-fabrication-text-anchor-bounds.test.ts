import { expect, test } from "bun:test"
import type { PcbBoard, PcbFabricationNoteText } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { renderFabricationText3dSnapshot } from "tests/fixtures/render-fabrication-text-3d-snapshot"

test.failing(
  "bottom fabrication text bounds follow its mirrored anchor",
  async () => {
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

    for (const angle of [0, 90, 180, 270]) {
      const circuit = [{ ...note, ccw_rotation: angle }]
      await expect(
        convertCircuitJsonToPcbSvg(circuit, { includeVersion: false }),
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

    const bounds = getComprehensivePcbBounds([note])
    expect(bounds.minX).toBeLessThan(-4)
    expect(bounds.maxX).toBeCloseTo(0, 8)
    const rotatedBounds = getComprehensivePcbBounds([
      { ...note, ccw_rotation: 90 },
    ])
    expect(rotatedBounds.minY).toBeLessThan(-4)
    expect(rotatedBounds.maxY).toBeCloseTo(0, 8)
  },
)
