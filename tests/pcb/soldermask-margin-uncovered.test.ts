import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

// Rows exercise positive/negative margins with the coverage flag omitted,
// then explicitly false. Columns include scalar and side-only margins.
function fixture(layer: "top" | "bottom"): AnyCircuitElement[] {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
  ]
  for (let row = 0; row < 4; row++) {
    const y = 6 - row * 4
    const margin = row % 2 === 0 ? 0.4 : -0.3
    const common = {
      y,
      soldermask_margin: margin,
      ...(row >= 2 ? { is_covered_with_solder_mask: false } : {}),
    }
    elements.push(
      {
        type: "pcb_hole",
        pcb_hole_id: `circle-${row}`,
        hole_shape: "circle",
        x: -12,
        hole_diameter: 2,
        ...common,
      },
      {
        type: "pcb_hole",
        pcb_hole_id: `pill-${row}`,
        hole_shape: "pill",
        x: -7.2,
        hole_width: 2,
        hole_height: 1.5,
        ...common,
      },
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: `pad-circle-${row}`,
        shape: "circle",
        layer,
        x: -2.4,
        radius: 1,
        ...common,
      },
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: `pad-rotated-${row}`,
        shape: "rotated_rect",
        layer,
        x: 2.4,
        width: 2,
        height: 1.5,
        ccw_rotation: 25,
        ...common,
      },
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: `pad-asymmetric-${row}`,
        shape: "rect",
        layer,
        x: 7.2,
        width: 2,
        height: 1.5,
        ...common,
        soldermask_margin: 0,
        soldermask_margin_right: margin,
      },
      {
        type: "pcb_plated_hole",
        pcb_plated_hole_id: `pth-${row}`,
        shape: "circle",
        layers: ["top", "bottom"],
        x: 12,
        outer_diameter: 2,
        hole_diameter: 0.8,
        ...common,
      },
    )
    for (const [col, name] of [
      "Hole",
      "Pill",
      "SMT",
      "Rotated",
      "Right only",
      "PTH",
    ].entries()) {
      elements.push({
        type: "pcb_silkscreen_text",
        pcb_silkscreen_text_id: `label-${row}-${col}`,
        pcb_component_id: "labels",
        layer,
        anchor_position: { x: -12 + col * 4.8, y: y + 1.65 },
        anchor_alignment: "center",
        font: "tscircuit2024",
        font_size: 0.35,
        text: `${name} ${margin > 0 ? "+" : ""}${margin} ${row < 2 ? "unset" : "false"}`,
      })
    }
  }
  return elements
}

for (const state of ["top", "bottom", "off"] as const) {
  test(`uncovered soldermask margins ${state}`, async () => {
    const layer = state === "bottom" ? "bottom" : "top"
    const svg = convertCircuitJsonToPcbSvg(fixture(layer), {
      width: 900,
      height: 600,
      viewport: { minX: -15, maxX: 15, minY: -10, maxY: 10 },
      layer,
      showSolderMask: state !== "off",
      includeVersion: false,
    })
    const rendered = new Resvg(svg).render()
    const pixels = rendered.pixels
    const pixel = (x: number, y: number) => {
      const offset =
        (Math.round(300 - y * 30) * 900 + Math.round(450 + x * 30)) * 4
      return Array.from(pixels.slice(offset, offset + 4))
    }
    // Check actual visible rings in addition to preserving the visual layout.
    for (const row of [0, 2]) {
      const y = 6 - row * 4
      for (const x of [-12, -2.4, 7.2, 12]) {
        if (state !== "off") {
          expect(pixel(x + 1.2, y)).toEqual([201, 162, 110, 255])
          const [r, g, b] = pixel(x + 0.9, y - 4)
          expect(g!).toBeGreaterThan(r!)
          expect(g!).toBeGreaterThan(b!)
        } else {
          expect(pixel(x + 1.2, y)).not.toEqual([201, 162, 110, 255])
        }
      }
    }
    await expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      `soldermask-margin-uncovered-${state}`,
    )
  })
}
