import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "../../lib/index.js"

export const PcbSilkScreenTextRotation = () => {
  const result = convertCircuitJsonToPcbSvg(pcbSoup)

  // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default {
  title: "Pcb Silkscreen Text Rotation",
  component: PcbSilkScreenTextRotation,
}

const pcbSoup: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    center: { x: 2.5, y: 2.5 },
    width: 10,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
  },
  // Horizontal text (0 degrees)
  {
    type: "pcb_silkscreen_text",
    layer: "top",
    pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
    font: "tscircuit2024",
    font_size: 0.5,
    pcb_component_id: "pcb_generic_component_0",
    anchor_position: { x: 0, y: 0 },
    anchor_alignment: "center",
    text: "0° at (0,0)",
    ccw_rotation: 0,
  },
  // Add SMT pad to mark the anchor point for horizontal text
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "anchor_pad_0",
    layer: "top",
    x: 0,
    y: 0,
    width: 0.3,
    height: 0.3,
    shape: "rect",
  },

  // Vertical text (90 degrees)
  {
    type: "pcb_silkscreen_text",
    layer: "top",
    pcb_silkscreen_text_id: "pcb_silkscreen_text_1",
    font: "tscircuit2024",
    font_size: 0.5,
    pcb_component_id: "pcb_generic_component_1",
    anchor_position: { x: 5, y: 0 },
    anchor_alignment: "center",
    text: "90° at (5,0)",
    ccw_rotation: 90,
  },
  // Add SMT pad to mark the anchor point for vertical text
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "anchor_pad_1",
    layer: "top",
    x: 5,
    y: 0,
    width: 0.3,
    height: 0.3,
    shape: "rect",
  },

  // Upside down text (180 degrees)
  {
    type: "pcb_silkscreen_text",
    layer: "top",
    pcb_silkscreen_text_id: "pcb_silkscreen_text_2",
    font: "tscircuit2024",
    font_size: 0.5,
    pcb_component_id: "pcb_generic_component_2",
    anchor_position: { x: 0, y: 5 },
    anchor_alignment: "center",
    text: "180° at (0,5)",
    ccw_rotation: 180,
  },
  // Add SMT pad to mark the anchor point for upside down text
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "anchor_pad_2",
    layer: "top",
    x: 0,
    y: 5,
    width: 0.3,
    height: 0.3,
    shape: "rect",
  },

  // Diagonal text (45 degrees)
  {
    type: "pcb_silkscreen_text",
    layer: "top",
    pcb_silkscreen_text_id: "pcb_silkscreen_text_3",
    font: "tscircuit2024",
    font_size: 0.5,
    pcb_component_id: "pcb_generic_component_3",
    anchor_position: { x: 5, y: 5 },
    anchor_alignment: "center",
    text: "45° at (5,5)",
    ccw_rotation: 45,
  },
  // Add SMT pad to mark the anchor point for diagonal text
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "anchor_pad_3",
    layer: "top",
    x: 5,
    y: 5,
    width: 0.3,
    height: 0.3,
    shape: "rect",
  },
]
