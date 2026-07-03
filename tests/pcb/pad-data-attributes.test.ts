import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("adds pad name and net name data attributes to smt pads and plated holes", () => {
  const result = convertCircuitJsonToPcbSvg([
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
      port_hints: ["pin1", "1"],
    },
    {
      type: "source_port",
      source_port_id: "source_port_1",
      source_component_id: "source_component_0",
      name: "pin2",
      pin_number: 2,
      port_hints: ["pin2", "2"],
    },
    {
      type: "source_net",
      source_net_id: "source_net_0",
      name: "VCC",
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_0",
      connected_source_port_ids: ["source_port_0", "source_port_1"],
      connected_source_net_ids: ["source_net_0"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_0",
      pcb_component_id: "pcb_component_0",
      source_port_id: "source_port_0",
      x: -1,
      y: 0,
      layers: ["top"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      pcb_component_id: "pcb_component_0",
      source_port_id: "source_port_1",
      x: 1,
      y: 0,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_0",
      pcb_port_id: "pcb_port_0",
      pcb_component_id: "pcb_component_0",
      shape: "rect",
      x: -1,
      y: 0,
      width: 0.5,
      height: 0.5,
      layer: "top",
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pcb_plated_hole_0",
      pcb_port_id: "pcb_port_1",
      pcb_component_id: "pcb_component_0",
      shape: "circle",
      x: 1,
      y: 0,
      outer_diameter: 0.7,
      hole_diameter: 0.4,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 4,
      height: 2,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
  ] as any)

  expect(result).toContain(
    'data-type="pcb_smtpad" data-pcb-layer="top" data-pad-name="U1.pin1" data-pad-net-name="VCC"',
  )
  expect(result).toContain(
    'data-type="pcb_plated_hole" data-pcb-layer="through" data-pad-name="U1.pin2" data-pad-net-name="VCC"',
  )
  expect(result.match(/data-pad-name=/g)).toHaveLength(2)
  expect(result).not.toContain('data-type="pcb_soldermask" data-pad-name=')
})
