import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getPcbBoundsFromCircuitJson } from "lib/pcb/get-pcb-bounds-from-circuit-json"

const circuitJson: any[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 8,
    height: 8,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace0",
    route: [
      { route_type: "wire", x: -3, y: 0, width: 0.4, layer: "top" },
      {
        route_type: "through_pad",
        start: { x: -0.4, y: 0 },
        end: { x: 0.4, y: 0 },
        width: 0.4,
        start_layer: "top",
        end_layer: "bottom",
        pcb_plated_hole_id: "hole0",
      },
      { route_type: "wire", x: 3, y: 0, width: 0.4, layer: "bottom" },
    ],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole0",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    x: 0,
    y: 0,
    hole_diameter: 0.6,
    rect_pad_width: 1.2,
    rect_pad_height: 1.2,
    layers: ["top", "bottom"],
  },
]

test("through_pad trace points contribute to pcb bounds", () => {
  const bounds = getPcbBoundsFromCircuitJson(circuitJson as any)

  expect(bounds.minX).toBe(-4)
  expect(bounds.maxX).toBe(4)
  expect(bounds.minY).toBe(-4)
  expect(bounds.maxY).toBe(4)
  expect(bounds.hasBounds).toBe(true)
})

test("through_pad traces render across layers with linked plated-hole pads", () => {
  const svg = convertCircuitJsonToPcbSvg(circuitJson)

  expect(svg).toContain('data-pcb-layer="top"')
  expect(svg).toContain('data-pcb-layer="bottom"')
  expect(svg).toContain('data-type="pcb_plated_hole"')
  expect(svg).toContain('data-type="pcb_plated_hole_drill"')
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
