import { expect, test } from "bun:test"
import { convertCircuitJsonToPinoutSvg } from "lib"

test("pinout basic", () => {
  const soup = [
    {
      type: "source_port",
      source_port_id: "source_port_0",
      name: "VCC",
    },
    {
      type: "source_port",
      source_port_id: "source_port_1",
      name: "GND",
    },
    {
      type: "source_port",
      source_port_id: "source_port_2",
      name: "TX",
    },
    {
      type: "source_port",
      source_port_id: "source_port_3",
      port_hints: ["RX"],
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_0",
      source_port_id: "source_port_0",
      x: -5,
      y: 3,
      is_board_pinout: true,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      source_port_id: "source_port_1",
      x: -5,
      y: -3,
      is_board_pinout: true,
    },
    {
      type: "pcb_smtpad",
      shape: "rect",
      x: -5,
      y: 3,
      width: 1,
      height: 1,
      layer: "top",
      pcb_smtpad_id: "smtpad_0",
      pcb_port_id: "pcb_port_0",
    },
    {
      type: "pcb_smtpad",
      shape: "rect",
      x: -5,
      y: -3,
      width: 1,
      height: 1,
      layer: "top",
      pcb_smtpad_id: "smtpad_1",
      pcb_port_id: "pcb_port_1",
    },
    {
      type: "pcb_plated_hole",
      shape: "circle",
      x: 5,
      y: 3,
      hole_diameter: 0.6,
      outer_diameter: 1,
      pcb_plated_hole_id: "ph_0",
      pcb_port_id: "pcb_port_2",
    },
    {
      type: "pcb_plated_hole",
      shape: "circle",
      x: 5,
      y: -3,
      hole_diameter: 0.6,
      outer_diameter: 1,
      pcb_plated_hole_id: "ph_1",
      pcb_port_id: "pcb_port_3",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_2",
      source_port_id: "source_port_2",
      x: 5,
      y: 3,
      is_board_pinout: true,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_3",
      source_port_id: "source_port_3",
      x: 5,
      y: -3,
      is_board_pinout: true,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_4",
      source_port_id: "source_port_4", // no source port, should not render
      x: 0,
      y: 5,
      is_board_pinout: true,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_5",
      source_port_id: "source_port_2", // Not a pinout port
      x: 0,
      y: 0,
    },
  ] as any

  expect(convertCircuitJsonToPinoutSvg(soup)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
