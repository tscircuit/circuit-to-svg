import type { AnyCircuitElement, LayerRef, PcbVia } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

export const vias: PcbVia[] = [
  {
    type: "pcb_via",
    pcb_via_id: "through",
    subcircuit_id: "board",
    x: -4.5,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["top", "inner1", "inner2", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "top_blind",
    subcircuit_id: "board",
    x: -1.5,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["top", "inner1", "inner2"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "buried",
    subcircuit_id: "board",
    x: 1.5,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["inner1", "inner2"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "bottom_blind",
    subcircuit_id: "board",
    x: 4.5,
    y: 0,
    outer_diameter: 1,
    hole_diameter: 0.5,
    layers: ["inner2", "bottom"],
  },
]

export const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    subcircuit_id: "board",
    center: { x: 0, y: 0 },
    width: 16,
    height: 6,
    thickness: 1.6,
    num_layers: 4,
    material: "fr4",
  },
  ...vias,
  ...vias.map(
    (via): AnyCircuitElement => ({
      type: "pcb_note_text",
      pcb_note_text_id: `${via.pcb_via_id}_label`,
      font: "tscircuit2024",
      layer: "top",
      anchor_position: { x: via.x, y: 1.2 },
      anchor_alignment: "center",
      font_size: 0.35,
      text: via.pcb_via_id.replaceAll("_", " "),
    }),
  ),
  ...vias.map(
    (via): AnyCircuitElement => ({
      type: "pcb_note_text",
      pcb_note_text_id: `${via.pcb_via_id}_layers`,
      font: "tscircuit2024",
      layer: "top",
      anchor_position: { x: via.x, y: -1.5 },
      anchor_alignment: "center",
      font_size: 0.3,
      text: via.layers.join("\n"),
    }),
  ),
]

export function renderViaLayerView(layer?: LayerRef): string {
  return convertCircuitJsonToPcbSvg(
    [
      ...circuit,
      {
        type: "pcb_note_text",
        pcb_note_text_id: "view_label",
        font: "tscircuit2024",
        layer: "top",
        anchor_position: { x: 0, y: 2.5 },
        anchor_alignment: "center",
        font_size: 0.45,
        text: `Copper view: ${layer ?? "all layers"}`,
      },
    ],
    {
      layer,
      width: 640,
      height: 240,
      viewport: { minX: -8, maxX: 8, minY: -3, maxY: 3 },
    },
  )
}
