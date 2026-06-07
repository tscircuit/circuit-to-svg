import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement, PcbSilkscreenGraphic } from "circuit-json"

test("pcb silkscreen graphic", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 40,
      height: 30,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_silkscreen_graphic",
      pcb_silkscreen_graphic_id: "graphic_top",
      pcb_component_id: "pcb_component_top",
      layer: "top",
      shape: "brep",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: -12, y: 8 },
            { x: -2, y: 8 },
            { x: -2, y: -2 },
            { x: -12, y: -2 },
          ],
        },
        inner_rings: [
          {
            vertices: [
              { x: -9, y: 5 },
              { x: -5, y: 5 },
              { x: -5, y: 1 },
              { x: -9, y: 1 },
            ],
          },
        ],
      },
    } as PcbSilkscreenGraphic,
    {
      type: "pcb_silkscreen_graphic",
      pcb_silkscreen_graphic_id: "graphic_bottom",
      pcb_component_id: "pcb_component_bottom",
      layer: "bottom",
      shape: "brep",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: 4, y: 7, bulge: -0.5 },
            { x: 14, y: 7 },
            { x: 14, y: -3, bulge: 0.5 },
            { x: 4, y: -3 },
          ],
        },
      },
    } as PcbSilkscreenGraphic,
  ]

  const result = convertCircuitJsonToPcbSvg(soup)

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
