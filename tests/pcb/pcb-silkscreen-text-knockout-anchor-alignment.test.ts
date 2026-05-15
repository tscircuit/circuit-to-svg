import { test, expect } from "bun:test"
import type { NinePointAnchor } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const alignmentLabelMap: Record<NinePointAnchor, string> = {
  top_left: "TL",
  top_center: "TC",
  top_right: "TR",
  center_left: "CL",
  center: "C",
  center_right: "CR",
  bottom_left: "BL",
  bottom_center: "BC",
  bottom_right: "BR",
}

const gridEntries: Array<{
  alignment: NinePointAnchor
  x: number
  y: number
}> = [
  { alignment: "top_left", x: -6, y: 6 },
  { alignment: "top_center", x: 0, y: 6 },
  { alignment: "top_right", x: 6, y: 6 },
  { alignment: "center_left", x: -6, y: 0 },
  { alignment: "center", x: 0, y: 0 },
  { alignment: "center_right", x: 6, y: 0 },
  { alignment: "bottom_left", x: -6, y: -6 },
  { alignment: "bottom_center", x: 0, y: -6 },
  { alignment: "bottom_right", x: 6, y: -6 },
]

const createAnchorMarker = (id: string, x: number, y: number) => [
  {
    type: "pcb_fabrication_note_path" as const,
    layer: "top" as const,
    pcb_component_id: "pcb_anchor_marker",
    pcb_fabrication_note_path_id: `anchor_marker_h_${id}`,
    route: [
      { x: x - 0.7, y },
      { x: x + 0.7, y },
    ],
    stroke_width: 0.12,
    color: "red",
  },
  {
    type: "pcb_fabrication_note_path" as const,
    layer: "top" as const,
    pcb_component_id: "pcb_anchor_marker",
    pcb_fabrication_note_path_id: `anchor_marker_v_${id}`,
    route: [
      { x, y: y - 0.7 },
      { x, y: y + 0.7 },
    ],
    stroke_width: 0.12,
    color: "red",
  },
  {
    type: "pcb_fabrication_note_rect" as const,
    layer: "top" as const,
    pcb_component_id: "pcb_anchor_marker",
    pcb_fabrication_note_rect_id: `anchor_marker_center_${id}`,
    center: { x, y },
    width: 0.22,
    height: 0.22,
    stroke_width: 0,
    is_filled: true,
    has_stroke: false,
    color: "red",
  },
]

const createBoard = () => ({
  type: "pcb_board" as const,
  pcb_board_id: "pcb_board_0",
  width: 18,
  height: 18,
  center: { x: 0, y: 0 },
  num_layers: 2,
  material: "fr4" as const,
  thickness: 1.2,
})

test("silkscreen knockout text honors anchor alignment", () => {
  const circuitJson = [
    createBoard(),
    ...gridEntries.flatMap(({ alignment, x, y }) => [
      {
        type: "pcb_silkscreen_text" as const,
        layer: "top" as const,
        pcb_silkscreen_text_id: `pcb_silkscreen_text_${alignment}`,
        font: "tscircuit2024",
        font_size: 1,
        pcb_component_id: "pcb_generic_component_0",
        anchor_position: { x, y },
        anchor_alignment: alignment,
        text: alignmentLabelMap[alignment],
        is_knockout: true,
      },
      ...createAnchorMarker(alignment, x, y),
    ]),
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "silkscreen-knockout-anchor-alignment",
  )
})
