import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("covered and negative-margin SMT pads preserve data-pad-name and data-pad-net-name, clamp oversized negative soldermask margins, and rotate pill_hole_with_rect_pad pin numbers", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 24,
      height: 12,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "source_component",
      source_component_id: "source_component_0",
      name: "U1",
      ftype: "simple_chip",
    } as any,
    ...[1, 2, 3, 4, 5, 6, 7].map((pin) => ({
      type: "source_port" as const,
      source_port_id: `source_port_${pin}`,
      source_component_id: "source_component_0",
      name: `pin${pin}`,
      pin_number: pin,
      port_hints: [`pin${pin}`, `${pin}`],
    })),
    {
      type: "source_net",
      source_net_id: "source_net_vdd",
      name: "VDD",
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_0",
      connected_source_port_ids: [
        "source_port_1",
        "source_port_2",
        "source_port_3",
        "source_port_4",
        "source_port_5",
        "source_port_6",
        "source_port_7",
      ],
      connected_source_net_ids: ["source_net_vdd"],
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "smt_rect_covered",
      source_port_id: "source_port_1",
      shape: "rect",
      layer: "top",
      x: -9,
      y: 2,
      width: 1.4,
      height: 1.0,
      corner_radius: 0.2,
      is_covered_with_solder_mask: true,
      soldermask_margin_left: 0.15,
      soldermask_margin_right: 0.15,
      soldermask_margin_top: 0.15,
      soldermask_margin_bottom: 0.15,
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "smt_rotated_rect_neg",
      source_port_id: "source_port_2",
      shape: "rotated_rect",
      layer: "top",
      x: -5,
      y: 2,
      width: 1.4,
      height: 1.0,
      ccw_rotation: 25,
      is_covered_with_solder_mask: true,
      soldermask_margin: -0.1,
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "smt_pill_covered_zero",
      source_port_id: "source_port_3",
      shape: "pill",
      layer: "top",
      x: -1,
      y: 2,
      width: 1.6,
      height: 0.8,
      radius: 0.4,
      is_covered_with_solder_mask: true,
      soldermask_margin: 0,
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "smt_rotated_pill_neg_oversized",
      source_port_id: "source_port_4",
      shape: "rotated_pill",
      layer: "top",
      x: 3,
      y: 2,
      width: 1.6,
      height: 0.8,
      radius: 0.2,
      ccw_rotation: 15,
      is_covered_with_solder_mask: true,
      soldermask_margin: -0.35,
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "smt_circle_covered",
      source_port_id: "source_port_5",
      shape: "circle",
      layer: "top",
      x: 7,
      y: 2,
      radius: 0.6,
      is_covered_with_solder_mask: true,
      soldermask_margin: -0.1,
    } as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "smt_polygon_covered",
      source_port_id: "source_port_6",
      shape: "polygon",
      layer: "top",
      points: [
        { x: -1, y: -3 },
        { x: 1, y: -3 },
        { x: 1, y: -1.5 },
        { x: -1, y: -1.5 },
      ],
      is_covered_with_solder_mask: true,
      soldermask_margin: 0,
    } as any,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_pill_rect_rotated",
      source_port_id: "source_port_7",
      shape: "pill_hole_with_rect_pad",
      hole_shape: "pill",
      pad_shape: "rect",
      x: 5,
      y: -2,
      hole_width: 0.8,
      hole_height: 1.4,
      rect_pad_width: 1.8,
      rect_pad_height: 2.6,
      rect_ccw_rotation: 35,
      rect_pad_offset_x: 0.4,
      rect_pad_offset_y: -0.3,
      layers: ["top", "bottom"],
    } as any,
  ]

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    showSolderMask: true,
    showPinNumbers: true,
  })

  // 1. All 6 SMT pads (including zero-margin covered and negative-margin NSMD pads) preserve data-pad-name and data-pad-net-name
  for (const pin of [1, 2, 3, 4, 5, 6, 7]) {
    expect(svg).toContain(`data-pad-name="U1.pin${pin}"`)
  }
  expect(svg.match(/data-pad-net-name="VDD"/g)).toHaveLength(7)

  // 2. Asymmetric positive margins on rounded rect pad expand the cutout corner radius above the base pad corner radius
  const cutoutMatch = svg.match(/<rect class="pcb-soldermask-cutout"[^>]*>/)
  const padMatch = svg.match(
    /<rect class="pcb-pad"[^>]*data-pad-name="U1\.pin1"[^>]*>/,
  )
  const cutoutRx = Number(cutoutMatch?.[0].match(/rx="([^"]+)"/)?.[1])
  const padRx = Number(padMatch?.[0].match(/rx="([^"]+)"/)?.[1])
  expect(cutoutRx).toBeGreaterThan(padRx)

  // 3. Oversized negative soldermask_margin on pill/circle/rect clamps rx/ry/r to >= 0 (never emits negative rx="-...")
  expect(svg).not.toMatch(/\brx="-/)
  expect(svg).not.toMatch(/\bry="-/)

  // 4. pill_hole_with_rect_pad pin number rotates by -rect_ccw_rotation (-35deg)
  expect(svg).toMatch(/data-pin-number="7"\s+transform="rotate\(-35\s/)
})
