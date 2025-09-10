import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

const pcbCircuitJson = [
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_0",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    x: -1.15,
    y: 0,
    hole_diameter: 1,
    rect_pad_width: 2.3,
    rect_pad_height: 1.3,
    port_hints: ["1"],
    layers: ["top", "bottom"],
    pcb_component_id: "pcb_generic_component_0",
    hole_offset_x: 0.6,
  },
]

test("Circular hole with rect pad offset", () => {
  expect(convertCircuitJsonToPcbSvg(pcbCircuitJson as any)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
