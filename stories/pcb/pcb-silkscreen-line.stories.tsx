import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "../../lib/index.js"

// Component to render PcbSilkscreenLine
export const PcbSilkScreenLine = () => {
  const result = convertCircuitJsonToPcbSvg(pcbSoup)

  // Render the SVG result as HTML
  // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default {
  title: "Pcb Silkscreen Line",
  component: PcbSilkScreenLine,
}

// Define the pcbSoup including pcb_silkscreen_line and other necessary elements
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
    rotation: 0,
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
  // Define pcb_silkscreen_line elements
  {
    type: "pcb_silkscreen_line",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_line_id: "pcb_silkscreen_line_0",
    x1: -0.515,
    y1: 6.46,
    x2: -0.515,
    y2: 2.125,
    stroke_width: 0.1,
  },
  {
    type: "pcb_silkscreen_line",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_line_id: "pcb_silkscreen_line_1",
    x1: -0.515,
    y1: 6.46,
    x2: 12.405,
    y2: 7.35,
    stroke_width: 0.1,
  },
  {
    type: "pcb_silkscreen_line",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_line_id: "pcb_silkscreen_line_2",
    x1: -0.515,
    y1: -2.1,
    x2: -0.515,
    y2: -6.46,
    stroke_width: 0.1,
  },
  {
    type: "pcb_silkscreen_line",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_line_id: "pcb_silkscreen_line_3",
    x1: -0.515,
    y1: -6.46,
    x2: 12.405,
    y2: -7.35,
    stroke_width: 0.1,
  },
]
