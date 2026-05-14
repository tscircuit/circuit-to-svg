import { test, expect } from "bun:test"
import type { NinePointAnchor } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const alignments: NinePointAnchor[] = [
  "top_left",
  "top_center",
  "top_right",
  "center_left",
  "center",
  "center_right",
  "bottom_left",
  "bottom_center",
  "bottom_right",
]

const createAnchorMarker = (id: string, x: number, y: number) => [
  {
    type: "pcb_silkscreen_line" as const,
    layer: "top" as const,
    pcb_component_id: "pcb_anchor_marker",
    pcb_silkscreen_line_id: `anchor_marker_h_${id}`,
    x1: x - 0.7,
    y1: y,
    x2: x + 0.7,
    y2: y,
    stroke_width: 0.12,
  },
  {
    type: "pcb_silkscreen_line" as const,
    layer: "top" as const,
    pcb_component_id: "pcb_anchor_marker",
    pcb_silkscreen_line_id: `anchor_marker_v_${id}`,
    x1: x,
    y1: y - 0.7,
    x2: x,
    y2: y + 0.7,
    stroke_width: 0.12,
  },
  {
    type: "pcb_silkscreen_circle" as const,
    layer: "top" as const,
    pcb_component_id: "pcb_anchor_marker",
    pcb_silkscreen_circle_id: `anchor_marker_dot_${id}`,
    center: { x, y },
    radius: 0.16,
    stroke_width: 0.08,
    is_filled: true,
  },
]

const createBoard = () => ({
  type: "pcb_board" as const,
  pcb_board_id: "pcb_board_0",
  width: 12,
  height: 12,
  center: { x: 0, y: 0 },
  num_layers: 2,
  material: "fr4" as const,
  thickness: 1.2,
})

const createCopperKnockoutSvg = (alignment: NinePointAnchor) =>
  convertCircuitJsonToPcbSvg([
    createBoard(),
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: `pcb_copper_text_${alignment}`,
      pcb_component_id: "pcb_generic_component_0",
      font: "tscircuit2024",
      font_size: 1,
      text: "TXT",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: alignment,
      is_knockout: true,
    },
    ...createAnchorMarker(alignment, 0, 0),
  ])

test("copper knockout text honors anchor alignment", () => {
  for (const alignment of alignments) {
    const svg = createCopperKnockoutSvg(alignment)

    expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      `copper-knockout-anchor-alignment_${alignment}`,
    )
  }
})
