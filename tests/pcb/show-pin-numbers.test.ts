import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import fourLayerRoutingCircuit from "../assets/four-layer-routing-circuit.json"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "source_component",
    source_component_id: "source_component_0",
    name: "U1",
    ftype: "simple_chip",
  },
  {
    type: "source_port",
    source_port_id: "source_port_0",
    source_component_id: "source_component_0",
    name: "pin1",
    pin_number: 1,
  },
  {
    type: "source_port",
    source_port_id: "source_port_1",
    source_component_id: "source_component_0",
    name: "pin2",
    pin_number: 2,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_0",
    source_port_id: "source_port_0",
    pcb_component_id: "pcb_component_0",
    x: -2,
    y: 0,
    layers: ["top"],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    pcb_component_id: "pcb_component_0",
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_0",
    pcb_port_id: "pcb_port_0",
    pcb_component_id: "pcb_component_0",
    shape: "rotated_rect",
    x: -2,
    y: 0,
    width: 1,
    height: 2,
    ccw_rotation: 30,
    layer: "top",
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_0",
    pcb_port_id: "pcb_port_1",
    pcb_component_id: "pcb_component_0",
    shape: "circle",
    x: 0,
    y: 0,
    outer_diameter: 1.5,
    hole_diameter: 0.7,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    port_hints: ["pin3"],
    shape: "circle",
    x: 2,
    y: 0,
    radius: 0.75,
    layer: "top",
  },
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 6,
    height: 3,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  },
]

test("showPinNumbers annotates SMT and through-hole pads", () => {
  const svgWithoutPinNumbers = convertCircuitJsonToPcbSvg(circuitJson)
  expect(svgWithoutPinNumbers).not.toContain("pcb-pad-pin-number")

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showPinNumbers: true,
  })

  expect(svg.match(/class="pcb-pad-pin-number"/g)).toHaveLength(3)
  expect(svg).toContain('data-pin-number="1"')
  expect(svg).toContain('data-pin-number="2"')
  expect(svg).toContain('data-pin-number="3"')
})

test("showPinNumbers on a real four-layer PCB", () => {
  const svg = convertCircuitJsonToPcbSvg(fourLayerRoutingCircuit as any, {
    showPinNumbers: true,
  })

  expect(svg.match(/class="pcb-pad-pin-number"/g)).toHaveLength(48)
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "show-pin-numbers-real-board",
  )
})
