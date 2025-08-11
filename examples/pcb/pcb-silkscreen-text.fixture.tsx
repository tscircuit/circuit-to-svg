import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "../../lib/index.js"

const pcbSoup: AnyCircuitElement[] = [
  {
    type: "source_component",
    ftype: "simple_power_source",
    source_component_id: "generic_0",
    name: "Generic Power Source",
    voltage: 5,
    supplier_part_numbers: {},
  },
  {
    type: "schematic_component",
    schematic_component_id: "schematic_generic_component_0",
    source_component_id: "generic_0",
    center: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  },
  {
    type: "pcb_component",
    source_component_id: "generic_0",
    pcb_component_id: "pcb_generic_component_0",
    layer: "top",
    center: { x: 0, y: 0 },
    rotation: 0,
    width: 0,
    height: 0,
  },
  {
    type: "pcb_plated_hole",
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
    outer_width: 2.6,
    outer_height: 3.78,
    hole_width: 1.1,
    hole_height: 2.28,
    shape: "pill",
    port_hints: [],
    pcb_component_id: "pcb_generic_component_0",
    pcb_plated_hole_id: "pcb_plated_hole_0",
  },
  {
    type: "pcb_silkscreen_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_path_id: "pcb_silkscreen_path_0",
    route: [
      { x: -0.515, y: 6.46 },
      { x: -0.515, y: 2.125 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_silkscreen_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_path_id: "pcb_silkscreen_path_1",
    route: [
      { x: -0.515, y: 6.46 },
      { x: 12.405, y: 7.35 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_silkscreen_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_path_id: "pcb_silkscreen_path_2",
    route: [
      { x: -0.515, y: -2.1 },
      { x: -0.515, y: -6.46 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_silkscreen_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_path_id: "pcb_silkscreen_path_3",
    route: [
      { x: -0.515, y: -6.46 },
      { x: 12.405, y: -7.35 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_silkscreen_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_path_id: "pcb_silkscreen_path_4",
    route: [
      { x: 12.405, y: 7.35 },
      { x: 12.405, y: -7.35 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_fabrication_note_path_id: "fabrication_note_path_0",
    route: [
      { x: -0.405, y: 6.35 },
      { x: -0.405, y: -6.35 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_fabrication_note_path_id: "fabrication_note_path_1",
    route: [
      { x: -0.405, y: 6.35 },
      { x: 12.295, y: 7.24 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_fabrication_note_path_id: "fabrication_note_path_2",
    route: [
      { x: 0.405, y: 5.597 },
      { x: 0.405, y: -5.597 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_fabrication_note_path_id: "fabrication_note_path_3",
    route: [
      { x: 0.405, y: 5.597 },
      { x: 12.295, y: 6.43 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_fabrication_note_path_id: "fabrication_note_path_4",
    route: [
      { x: 12.295, y: 7.24 },
      { x: 12.295, y: -7.24 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_fabrication_note_path_id: "fabrication_note_path_5",
    route: [
      { x: 12.295, y: -7.24 },
      { x: -0.405, y: -6.35 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_fabrication_note_path_id: "fabrication_note_path_6",
    route: [
      { x: 12.3, y: -6.43 },
      { x: 0.405, y: -5.597 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_silkscreen_text",
    layer: "top",
    pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
    font: "tscircuit2024",
    font_size: 1,
    pcb_component_id: "pcb_generic_component_0",
    anchor_position: { x: 6.35, y: 0 },
    anchor_alignment: "center",
    text: "${REFERENCE}",
  },
  {
    type: "pcb_fabrication_note_text",
    layer: "top",
    font: "tscircuit2024",
    font_size: 1.27,
    pcb_component_id: "pcb_generic_component_0",
    anchor_position: { x: 6.35, y: 8.5 },
    anchor_alignment: "center",
    text: "REF**",
    pcb_fabrication_note_text_id: "pcb_fabrication_note_text_0",
  },
  {
    type: "pcb_fabrication_note_text",
    layer: "top",
    font: "tscircuit2024",
    font_size: 1.27,
    pcb_component_id: "pcb_generic_component_0",
    anchor_position: { x: 6.35, y: -8.5 },
    anchor_alignment: "center",
    text: "Heatsink_AAVID_576802B03900G",
    pcb_fabrication_note_text_id: "pcb_fabrication_note_text_1",
  },
]

const Component = () => {
  const result = convertCircuitJsonToPcbSvg(pcbSoup)

  // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default <Component />
