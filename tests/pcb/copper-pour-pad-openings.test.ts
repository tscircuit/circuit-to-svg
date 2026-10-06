import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToPcbSvg } from "lib"
import type { AnyCircuitElement } from "circuit-json"

for (const layer of ["top", "bottom"] as const) {
  test(`${layer} copper pour preserves exposed and partially masked pad openings`, () => {
    const circuit: AnyCircuitElement[] = [
      {
        type: "pcb_board",
        pcb_board_id: "board",
        center: { x: 0, y: 0 },
        width: 12,
        height: 8,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
      },
      {
        type: "pcb_copper_pour",
        pcb_copper_pour_id: "pour",
        shape: "rect",
        layer,
        center: { x: 0, y: 0 },
        width: 10,
        height: 6,
        covered_with_solder_mask: true,
      },
      ...[-3, 0, 3].map((x, i) => ({
        type: "pcb_smtpad" as const,
        pcb_smtpad_id: `pad${i}`,
        pcb_component_id: "component",
        shape: "rotated_pill" as const,
        layer,
        x,
        y: 0,
        width: 1,
        height: 3,
        radius: 0.5,
        ccw_rotation: 180,
        is_covered_with_solder_mask: i !== 0,
        soldermask_margin: i === 2 ? -0.2 : 0,
      })),
    ]
    const render = (elements: AnyCircuitElement[]) => {
      const svg = convertCircuitJsonToPcbSvg(elements, {
        layer,
        showSolderMask: true,
        width: 600,
        height: 400,
        viewport: { minX: -6, maxX: 6, minY: -4, maxY: 4 },
        colorOverrides: { copper: { top: "#ffcc00", bottom: "#ffcc00" } },
      })
      const { pixels } = new Resvg(svg).render()
      const pixel = (x: number, y: number) => {
        const offset =
          (Math.round((4 - y) * 50) * 600 + Math.round((x + 6) * 50)) * 4
        return Array.from(pixels.subarray(offset, offset + 4))
      }
      return { svg, pixel }
    }
    const actual = render(circuit)
    const withoutPour = render(
      circuit.filter((element) => element.type !== "pcb_copper_pour"),
    )
    expect(actual.pixel(-3, 0)).toEqual([255, 204, 0, 255])
    expect(actual.pixel(3, 0)).toEqual([255, 204, 0, 255])
    expect(actual.pixel(0, 0)).not.toEqual([255, 204, 0, 255])
    expect(actual.pixel(3.4, 0)).not.toEqual([255, 204, 0, 255])
    expect(actual.pixel(-3, 0)).toEqual(withoutPour.pixel(-3, 0))
    expect(actual.pixel(3, 0)).toEqual(withoutPour.pixel(3, 0))
    expect(actual.svg).toMatchSvgSnapshot(
      import.meta.path,
      `copper-pour-pad-openings-${layer}`,
    )
  })
}
