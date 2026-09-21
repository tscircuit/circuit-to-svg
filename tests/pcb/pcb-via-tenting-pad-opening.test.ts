import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToPcbSvg } from "lib"
import { circuit } from "./pcb-via-tenting-pad-opening.fixture"

test("pad openings clip via tenting on both faces", () => {
  function render(layer: "top" | "bottom") {
    const svg = convertCircuitJsonToPcbSvg(
      circuit.map((element) =>
        element.type === "pcb_note_text" && element.pcb_note_text_id === "title"
          ? {
              ...element,
              text: `${layer.toUpperCase()} VIEW - soldermask enabled\n${element.text}`,
            }
          : element,
      ),
      {
        layer,
        showSolderMask: true,
        width: 1200,
        height: 700,
        viewport: { minX: -6, maxX: 6, minY: -3.5, maxY: 3.5 },
      },
    )
    const { pixels } = new Resvg(svg).render()
    function pixel(x: number, y: number) {
      const offset =
        (Math.round((3.5 - y) * 100) * 1200 + Math.round((x + 6) * 100)) * 4
      return Array.from(pixels.subarray(offset, offset + 4))
    }
    expect(pixel(1.75, -0.5)).toEqual(pixel(1, -0.5))
    expect(pixel(2.35, -0.5)).toEqual(pixel(-3.5, -0.5))
    expect(pixel(2.1, -0.5)).toEqual(pixel(-3.5, -0.5))
    expect(pixel(1, -0.5)).not.toEqual(pixel(-3.5, -0.5))
    return svg
  }

  const top = render("top")
  const bottom = render("bottom")
  expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1400">${top}<g transform="translate(0 700)">${bottom}</g></svg>`,
  ).toMatchSvgSnapshot(import.meta.path)
})
