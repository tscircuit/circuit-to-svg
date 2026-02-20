import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("circular_hole_with_rect_pad with ccw_rotation in pcb", () => {
  const result = convertCircuitJsonToPcbSvg(
    [
      {
        type: "pcb_plated_hole",
        pcb_plated_hole_id: "pcb_plated_hole_1",
        pcb_component_id: "pcb_component_1",
        shape: "circular_hole_with_rect_pad",
        x: -3,
        y: 0,
        hole_diameter: 1,
        rect_pad_width: 3,
        rect_pad_height: 1.5,
        hole_offset_x: 0,
        hole_offset_y: 0,
        layers: ["top", "bottom"],
        port_hints: ["1"],
        rect_ccw_rotation: 0,
      } as any,
      {
        type: "pcb_plated_hole",
        pcb_plated_hole_id: "pcb_plated_hole_2",
        pcb_component_id: "pcb_component_1",
        shape: "circular_hole_with_rect_pad",
        x: 3,
        y: 0,
        hole_diameter: 1,
        rect_pad_width: 3,
        rect_pad_height: 1.5,
        hole_offset_x: 0,
        hole_offset_y: 0,
        layers: ["top", "bottom"],
        port_hints: ["2"],
        rect_ccw_rotation: 45,
      } as any,
      {
        type: "pcb_board",
        center: { x: 0, y: 0 },
        width: 15,
        height: 10,
        material: "fr4",
        num_layers: 2,
        thickness: 1.6,
        pcb_board_id: "board_0",
      },
    ] as any,
    {},
  )

  expect(result).toMatchSvgSnapshot(`${import.meta.path} - pcb`)
})
