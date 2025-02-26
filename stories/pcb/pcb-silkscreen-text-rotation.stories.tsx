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
    center: { x: 0, y: 0 },
    width: 30,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
  },
  // Horizontal text (0 degrees)
  {
    type: "pcb_silkscreen_text",
    layer: "top",
    pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
    font: "tscircuit2024",
    font_size: 1,
    pcb_component_id: "pcb_generic_component_0",
    anchor_position: { x: 0, y: 0 },
    anchor_alignment: "center",
    text: "Horizontal Text",
    rotation: 0,
  },
  // Vertical text (90 degrees)
  {
    type: "pcb_silkscreen_text",
    layer: "top",
    pcb_silkscreen_text_id: "pcb_silkscreen_text_1",
    font: "tscircuit2024",
    font_size: 1,
    pcb_component_id: "pcb_generic_component_1",
    anchor_position: { x: 5, y: 0 },
    anchor_alignment: "center",
    text: "Vertical Text",
    rotation: 90,
  },
  // Upside down text (180 degrees)
  {
    type: "pcb_silkscreen_text",
    layer: "top",
    pcb_silkscreen_text_id: "pcb_silkscreen_text_2",
    font: "tscircuit2024",
    font_size: 1,
    pcb_component_id: "pcb_generic_component_2",
    anchor_position: { x: 0, y: 5 },
    anchor_alignment: "center",
    text: "Upside Down Text",
    rotation: 180,
  },
  // Diagonal text (45 degrees)
  {
    type: "pcb_silkscreen_text",
    layer: "top",
    pcb_silkscreen_text_id: "pcb_silkscreen_text_3",
    font: "tscircuit2024",
    font_size: 1,
    pcb_component_id: "pcb_generic_component_3",
    anchor_position: { x: 5, y: 5 },
    anchor_alignment: "center",
    text: "Diagonal Text",
    rotation: 45,
  },
]
