import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "../../lib/index.js"

// Component to render PcbSilkscreenCircle
export const PcbSilkScreenCircle = () => {
  const result = convertCircuitJsonToPcbSvg(pcbSoup)

  // Render the SVG result as HTML
  // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
  return <div dangerouslySetInnerHTML={{ __html: result }} />
}

export default {
  title: "Pcb Silkscreen Circle",
  component: PcbSilkScreenCircle,
}

// Define the pcbSoup including pcb_silkscreen_circle and other necessary elements
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
  // Define pcb_silkscreen_circle elements
  {
    type: "pcb_silkscreen_circle",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_circle_id: "pcb_silkscreen_circle_0",
    center: { x: 3.0, y: 4.0 },
    radius: 1.5,
  },
  {
    type: "pcb_silkscreen_circle",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_circle_id: "pcb_silkscreen_circle_1",
    center: { x: 8.0, y: 6.0 },
    radius: 2.0,
  },
  {
    type: "pcb_silkscreen_circle",
    layer: "top",
    pcb_component_id: "pcb_generic_component_0",
    pcb_silkscreen_circle_id: "pcb_silkscreen_circle_2",
    center: { x: -3.0, y: -4.0 },
    radius: 1.0,
  },
]
