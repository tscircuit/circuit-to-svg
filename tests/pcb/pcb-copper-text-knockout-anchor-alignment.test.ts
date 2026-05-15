import { test, expect } from "bun:test"
import type { AnyCircuitElement, NinePointAnchor } from "circuit-json"
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
  width: 18,
  height: 18,
  center: { x: 0, y: 0 },
  num_layers: 2,
  material: "fr4" as const,
  thickness: 1.2,
})

test("copper knockout text honors anchor alignment", () => {
  const circuitJson: AnyCircuitElement[] = [
    createBoard(),
    ...gridEntries.flatMap(({ alignment, x, y }) => [
      {
        type: "pcb_copper_text" as const,
        pcb_copper_text_id: `pcb_copper_text_${alignment}`,
        pcb_component_id: "pcb_generic_component_0",
        font: "tscircuit2024" as const,
        font_size: 1,
        text: alignmentLabelMap[alignment],
        layer: "top" as const,
        anchor_position: { x, y },
        anchor_alignment: alignment,
        is_knockout: true,
      },
      ...createAnchorMarker(alignment, x, y),
    ]),
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "copper-knockout-anchor-alignment",
  )
})
