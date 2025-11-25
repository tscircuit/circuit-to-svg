import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type {
  AnyCircuitElement,
  PcbCopperPour,
  PcbSilkscreenText,
} from "circuit-json"

test("copper pours respect soldermask coverage flag", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board-mask-pours",
      center: { x: 0, y: 0 },
      width: 60,
      height: 40,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // Covered pour (top left) - top layer
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "covered_rect_top",
      layer: "top",
      center: { x: -15, y: 10 },
      width: 12,
      height: 10,
      covered_with_solder_mask: true,
    } as PcbCopperPour,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "label1",
      anchor_position: { x: -15, y: 16 },
      text: "TOP, SOLDERMASK COVERED COPPER",
      font_size: 0.8,
      layer: "top",
      anchor_alignment: "center",
    } as PcbSilkscreenText,
    // Uncovered pour (top center) - top layer
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "uncovered_rect_top_center",
      layer: "top",
      center: { x: 0, y: 10 },
      width: 12,
      height: 10,
      covered_with_solder_mask: false,
    } as PcbCopperPour,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "label2a",
      anchor_position: { x: 0, y: 16 },
      text: "TOP, UNCOVERED COPPER",
      font_size: 0.8,
      layer: "top",
      anchor_alignment: "center",
    } as PcbSilkscreenText,
    // Substrate only (top right) - uncovered pour showing substrate (no visible copper)
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "substrate_only_top",
      layer: "top",
      center: { x: 15, y: 10 },
      width: 12,
      height: 10,
      covered_with_solder_mask: false,
    } as PcbCopperPour,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "label2",
      anchor_position: { x: 15, y: 16 },
      text: "TOP, SUBSTRATE (NO COPPER, NO SOLDERMASK)",
      font_size: 0.8,
      layer: "top",
      anchor_alignment: "center",
    } as PcbSilkscreenText,
    // Covered polygon on bottom layer (left)
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "bottom_polygon_covered",
      shape: "polygon",
      layer: "bottom",
      points: [
        { x: -18, y: -5 },
        { x: -12, y: -5 },
        { x: -10, y: -10 },
        { x: -15, y: -18 },
        { x: -20, y: -10 },
      ],
      covered_with_solder_mask: true,
    } as PcbCopperPour,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "label3",
      anchor_position: { x: -15, y: -2 },
      text: "BOTTOM, SOLDERMASK COVERED COPPER",
      font_size: 0.8,
      layer: "top",
      anchor_alignment: "center",
    } as PcbSilkscreenText,
    // Bottom layer uncovered rectangle (center)
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "uncovered_rect_bottom",
      layer: "bottom",
      center: { x: 0, y: -12 },
      width: 10,
      height: 8,
      covered_with_solder_mask: false,
    } as PcbCopperPour,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "label4",
      anchor_position: { x: 0, y: -8 },
      text: "BOTTOM, UNCOVERED COPPER",
      font_size: 0.8,
      layer: "top",
      anchor_alignment: "center",
    } as PcbSilkscreenText,
    // Substrate only (bottom right) - uncovered pour showing substrate (no visible copper)
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "substrate_only_bottom",
      layer: "bottom",
      center: { x: 18, y: -12 },
      width: 12,
      height: 6,
      covered_with_solder_mask: false,
    } as PcbCopperPour,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "label5",
      anchor_position: { x: 18, y: -7 },
      text: "BOTTOM, SUBSTRATE (NO COPPER, NO SOLDERMASK)",
      font_size: 0.8,
      layer: "top",
      anchor_alignment: "center",
    } as PcbSilkscreenText,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showSolderMask: true,
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
