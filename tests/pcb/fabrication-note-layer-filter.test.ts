import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("filters pcb_fabrication_note_path and pcb_fabrication_note_dimension by layer", () => {
  const circuitJson: any[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "fab_path_top",
      layer: "top",
      route: [
        { x: -2, y: 0 },
        { x: 2, y: 0 },
      ],
      stroke_width: 0.1,
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "fab_path_bottom",
      layer: "bottom",
      route: [
        { x: -2, y: 2 },
        { x: 2, y: 2 },
      ],
      stroke_width: 0.1,
    },
    {
      type: "pcb_fabrication_note_dimension",
      pcb_fabrication_note_dimension_id: "fab_dim_default_top",
      from: { x: 0, y: 0 },
      to: { x: 5, y: 0 },
      text: "5.00 mm",
      arrow_size: 0.8,
    },
  ]

  const topSvg = convertCircuitJsonToPcbSvg(circuitJson, { layer: "top" })
  expect(topSvg).toContain('data-pcb-fabrication-note-path-id="fab_path_top"')
  expect(topSvg).not.toContain(
    'data-pcb-fabrication-note-path-id="fab_path_bottom"',
  )
  expect(topSvg).toContain(
    'data-pcb-fabrication-note-dimension-id="fab_dim_default_top"',
  )

  const bottomSvg = convertCircuitJsonToPcbSvg(circuitJson, { layer: "bottom" })
  expect(bottomSvg).toContain(
    'data-pcb-fabrication-note-path-id="fab_path_bottom"',
  )
  expect(bottomSvg).not.toContain(
    'data-pcb-fabrication-note-path-id="fab_path_top"',
  )
  expect(bottomSvg).not.toContain(
    'data-pcb-fabrication-note-dimension-id="fab_dim_default_top"',
  )
})
