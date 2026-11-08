import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("plated hole soldermask cutout, oval soldermask, rotated_pill polygon hole rotation, and bottom board soldermask color", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 24,
      height: 16,
      thickness: 1.6,
      num_layers: 4,
      material: "fr4",
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_rotated_pill_rect_pos_margin",
      shape: "rotated_pill_hole_with_rect_pad",
      x: -6,
      y: 0,
      layers: ["top", "bottom"],
      hole_shape: "rotated_pill",
      pad_shape: "rect",
      hole_width: 1.2,
      hole_height: 0.6,
      hole_ccw_rotation: 30,
      rect_pad_width: 2.4,
      rect_pad_height: 1.6,
      rect_ccw_rotation: 30,
      is_covered_with_solder_mask: true,
      soldermask_margin: 0.2,
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_oval_pos_margin",
      shape: "oval",
      x: 0,
      y: 0,
      layers: ["top", "bottom"],
      outer_width: 2.2,
      outer_height: 1.4,
      hole_width: 1.0,
      hole_height: 0.6,
      ccw_rotation: 15,
      is_covered_with_solder_mask: true,
      soldermask_margin: 0.15,
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_polygon_rotated_pill_hole",
      shape: "hole_with_polygon_pad",
      x: 6,
      y: 0,
      layers: ["top", "bottom"],
      hole_shape: "rotated_pill",
      hole_width: 1.4,
      hole_height: 0.6,
      hole_ccw_rotation: 45,
      pad_outline: [
        { x: -1.5, y: -1.0 },
        { x: 1.5, y: -1.0 },
        { x: 1.5, y: 1.0 },
        { x: -1.5, y: 1.0 },
      ],
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_blind_top_inner1",
      shape: "circle",
      x: 9,
      y: 4,
      layers: ["top", "inner1"],
      outer_diameter: 1.6,
      hole_diameter: 0.8,
    } as any,
  ]

  const colorOverrides = {
    soldermask: {
      top: "rgb(12, 55, 33)",
      bottom: "rgb(10, 40, 90)",
    },
    soldermaskWithCopperUnderneath: {
      top: "rgb(18, 82, 50)",
      bottom: "rgb(20, 60, 120)",
    },
  }

  const topSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "top",
    showSolderMask: true,
    colorOverrides,
  })

  // 1. rotated_pill_hole_with_rect_pad with positive soldermask_margin must render a substrate pcb-soldermask-cutout behind the pad
  expect(topSvg).toContain('class="pcb-soldermask-cutout"')
  expect(topSvg).not.toContain('class="pcb-solder-mask"')

  // 2. oval plated hole with positive soldermask_margin must also emit an ellipse pcb-soldermask-cutout
  const ovalCutoutMatches = topSvg.match(
    /<ellipse[^>]*class="pcb-soldermask-cutout"/g,
  )
  expect(ovalCutoutMatches?.length).toBe(1)

  // 3. hole_with_polygon_pad with hole_shape="rotated_pill" must apply hole_ccw_rotation to the inner drill path
  expect(topSvg).toContain("rotate(-45)")

  // 4. blind plated hole on ["top", "inner1"] (shape: "circle") is visible on top layer but omitted on bottom layer
  expect(topSvg).toContain('<circle class="pcb-hole-outer"')

  const bottomSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer: "bottom",
    showSolderMask: true,
    colorOverrides,
  })

  expect(bottomSvg).not.toContain('<circle class="pcb-hole-outer"')
  // 5. bottom-layer board soldermask uses colorMap.soldermask.bottom and plated hole pads/cutouts use data-pcb-layer="bottom"
  expect(bottomSvg).toContain('fill="rgb(10, 40, 90)"')
  expect(bottomSvg).toContain(
    'data-type="pcb_soldermask_opening" data-pcb-layer="bottom"',
  )
})
