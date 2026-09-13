import { Resvg } from "@resvg/resvg-js"
import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbVia } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

test("via soldermask respects per-side flags, legacy overrides, and physical spans", () => {
  const spans: PcbVia["layers"][] = [
    ["top", "bottom"],
    ["top", "inner1"],
    ["inner1", "bottom"],
    ["inner1", "inner2"],
  ]
  for (const layer of [undefined, "top", "bottom"] as const) {
    const face = layer ?? "top"
    for (const layers of spans) {
      for (const connected of [false, true]) {
        for (const legacy of [undefined, false, true]) {
          for (const top of [undefined, false, true]) {
            for (const bottom of [undefined, false, true]) {
              const elements: AnyCircuitElement[] = [
                {
                  type: "pcb_board",
                  pcb_board_id: "board",
                  center: { x: 50, y: 50 },
                  width: 100,
                  height: 100,
                  num_layers: 4,
                  thickness: 1.6,
                  material: "fr4",
                },
                {
                  type: "pcb_via",
                  pcb_via_id: "via",
                  x: 50,
                  y: 50,
                  outer_diameter: 40,
                  hole_diameter: 20,
                  layers,
                  tented_on_top: top,
                  tented_on_bottom: bottom,
                  ...{ is_tented: legacy },
                },
              ]
              if (connected) {
                elements.push({
                  type: "pcb_trace",
                  pcb_trace_id: "trace",
                  route: [
                    { route_type: "wire", x: 10, y: 50, layer: face, width: 4 },
                    { route_type: "wire", x: 50, y: 50, layer: face, width: 4 },
                    {
                      route_type: "via",
                      x: 50,
                      y: 50,
                      from_layer: layers[0]!,
                      to_layer: layers[1]!,
                    },
                  ],
                })
              }
              const svg = convertCircuitJsonToPcbSvg(elements, {
                width: 100,
                height: 100,
                drawPaddingOutsideBoard: false,
                showSolderMask: true,
                layer,
                colorOverrides: {
                  soldermask: { top: "#00ff00", bottom: "#00ff00" },
                  soldermaskOverCopper: { top: "#008800", bottom: "#004488" },
                  copper: { top: "#ff0000", bottom: "#0000ff" },
                  drill: "#ffffff",
                },
              })
              const rendered = new Resvg(svg, {
                font: { loadSystemFonts: false },
              }).render()
              const pixel = (x: number, y = 50) => {
                const offset = (y * rendered.width + x) * 4
                return Array.from(rendered.pixels.slice(offset, offset + 4))
              }
              const isTented =
                (face === "top" ? top : bottom) ?? legacy ?? false
              if (layers.includes(face)) {
                const mask =
                  face === "top" ? [0, 136, 0, 255] : [0, 68, 136, 255]
                expect(pixel(50)).toEqual(
                  isTented ? mask : [255, 255, 255, 255],
                )
                expect(pixel(65)).toEqual(
                  isTented
                    ? mask
                    : face === "top"
                      ? [255, 0, 0, 255]
                      : [0, 0, 255, 255],
                )
                // The trace reaches the drill center from the left.
                expect(pixel(45)).toEqual(
                  isTented ? mask : [255, 255, 255, 255],
                )
              } else {
                expect(svg).not.toContain('data-type="pcb_via"')
                expect(pixel(65)).toEqual(pixel(80, 80))
              }
            }
          }
        }
      }
    }
  }
})
