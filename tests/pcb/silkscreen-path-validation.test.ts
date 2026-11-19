import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("skips degenerate silkscreen paths and omits undefined data-pcb-component-id", () => {
  const circuitJson: any[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "ss_empty",
      layer: "top",
      route: [],
      stroke_width: 0.1,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "ss_single_point",
      layer: "top",
      route: [{ x: 1, y: 1 }],
      stroke_width: 0.1,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "ss_board_level",
      layer: "top",
      route: [
        { x: -2, y: 0 },
        { x: 2, y: 0 },
      ],
      stroke_width: 0.1,
    },
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson)
  expect(svg).not.toContain('data-pcb-silkscreen-path-id="ss_empty"')
  expect(svg).not.toContain('data-pcb-silkscreen-path-id="ss_single_point"')
  expect(svg).toContain('data-pcb-silkscreen-path-id="ss_board_level"')
  expect(svg).not.toContain('data-pcb-component-id="undefined"')
})
