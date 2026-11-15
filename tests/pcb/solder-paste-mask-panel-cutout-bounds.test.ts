import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { parseSync } from "svgson"
import { convertCircuitJsonToSolderPasteMask } from "lib"

test("solder paste mask renders pcb_panel and pcb_cutout shapes", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel0",
      width: 40,
      height: 30,
      thickness: 1.6,
      center: { x: 0, y: 0 },
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 15,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout_rect",
      shape: "rect",
      center: { x: -4, y: 0 },
      width: 3,
      height: 2,
      rotation: 30,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout_circle",
      shape: "circle",
      center: { x: 4, y: 0 },
      radius: 1.5,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout_poly",
      shape: "polygon",
      points: [
        { x: -1, y: 3 },
        { x: 1, y: 3 },
        { x: 0, y: 5 },
      ],
    },
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "paste_top",
      layer: "top",
      shape: "rect",
      x: 0,
      y: -3,
      width: 2,
      height: 1,
    },
  ]

  const svg = convertCircuitJsonToSolderPasteMask(circuitJson, {
    layer: "top",
  })

  expect(svg).toContain('class="pcb-panel"')
  expect(svg).toContain('data-type="pcb_panel"')
  expect(svg).toContain('class="pcb-cutout pcb-cutout-rect"')
  expect(svg).toContain('class="pcb-cutout pcb-cutout-circle"')
  expect(svg).toContain('class="pcb-cutout pcb-cutout-polygon"')
})

test("solder paste mask handles empty layer bounds without NaN and rotates oval paste", () => {
  const emptyLayerSvg = convertCircuitJsonToSolderPasteMask([], {
    layer: "top",
  })
  expect(emptyLayerSvg).not.toMatch(/NaN|Infinity/)

  const rotatedOvalCircuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "paste_rotated_oval",
      layer: "top",
      shape: "oval",
      x: 4,
      y: 0,
      width: 2.4,
      height: 1.2,
      ccw_rotation: 30,
    } as any,
  ]

  const svg = convertCircuitJsonToSolderPasteMask(rotatedOvalCircuit, {
    layer: "top",
  })
  const parsed = parseSync(svg)
  const rotatedOval = parsed.children.find(
    (child) =>
      child.name === "ellipse" &&
      child.attributes?.["data-type"] === "pcb_solder_paste",
  )
  expect(rotatedOval).toBeDefined()
  expect(rotatedOval?.attributes.transform).toContain("rotate(-30)")
})
