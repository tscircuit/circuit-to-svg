import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 12,
    height: 7,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "source_port",
    source_port_id: "source_port_1",
    name: "pin1",
    pin_number: 1,
  },
  ...(["top", "bottom"] as const).flatMap((layer): AnyCircuitElement[] => [
    {
      type: "pcb_port",
      pcb_port_id: `pcb_port_${layer}`,
      source_port_id: "source_port_1",
      x: 0.5,
      y: -0.5,
      layers: [layer],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: `pad_${layer}`,
      pcb_component_id: "component",
      pcb_port_id: `pcb_port_${layer}`,
      shape: "rect",
      x: 0.5,
      y: -0.5,
      width: 0.8,
      height: 0.8,
      layer,
      is_covered_with_solder_mask: true,
    },
    {
      type: "pcb_soldermask_opening",
      pcb_soldermask_opening_id: `${layer}_opening`,
      shape: "rect",
      layer,
      x: 1,
      y: -0.5,
      width: 2.2,
      height: 1.6,
    },
  ]),
  {
    type: "pcb_via",
    pcb_via_id: "partially_exposed_via",
    x: 2.1,
    y: -0.5,
    outer_diameter: 1.2,
    hole_diameter: 0.4,
    layers: ["top", "bottom"],
    tented_on_top: true,
    tented_on_bottom: true,
  },
  {
    type: "pcb_via",
    pcb_via_id: "fully_tented_via",
    x: -3.5,
    y: -0.5,
    outer_diameter: 1.2,
    hole_diameter: 0.4,
    layers: ["top", "bottom"],
    tented_on_top: true,
    tented_on_bottom: true,
  },
]

test("standalone soldermask openings expose layer-accurate via copper without duplicating pin numbers", async () => {
  function render(layer: "top" | "bottom") {
    const svg = convertCircuitJsonToPcbSvg(circuit, {
      layer,
      showSolderMask: true,
      showPinNumbers: true,
      width: 1200,
      height: 700,
      viewport: { minX: -6, maxX: 6, minY: -3.5, maxY: 3.5 },
      colorOverrides: {
        copper: { top: "#ff0000", bottom: "#0000ff" },
        substrate: "#c9a26e",
      },
    })
    expect(svg.match(/class="pcb-pad-pin-number"/g)?.length).toBe(1)

    const { pixels } = new Resvg(svg).render()
    function pixel(x: number, y: number) {
      const offset =
        (Math.round((3.5 - y) * 100) * 1200 + Math.round((x + 6) * 100)) * 4
      return Array.from(pixels.subarray(offset, offset + 3))
    }

    const expectedCopper = layer === "top" ? [255, 0, 0] : [0, 0, 255]
    // Exposed via ring inside the soldermask opening uses the active layer's copper color.
    expect(pixel(1.7, -0.5)).toEqual(expectedCopper)
    // Exposed via drill inside the soldermask opening is not shaded by tenting.
    expect(pixel(2.0, -0.5)).not.toEqual(pixel(-3.5, -0.5))
    // Via ring outside the soldermask opening remains tented.
    expect(pixel(2.5, -0.5)).toEqual(pixel(-3.1, -0.5))
    return svg
  }

  const top = render("top")
  const bottom = render("bottom")
  await expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1400">${top}<g transform="translate(0 700)">${bottom}</g></svg>`,
  ).toMatchSvgSnapshot(import.meta.path)
})
