import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToPcbSvg } from "lib"
import { circuit } from "./pcb-via-tenting-pad-opening.fixture"

test("pad openings clip via tenting on both faces", () => {
  function render(layer: "top" | "bottom") {
    const svg = convertCircuitJsonToPcbSvg(
      circuit.map((element) =>
        element.type === "pcb_note_text"
          ? { ...element, text: `${layer.toUpperCase()} VIEW\n${element.text}` }
          : element,
      ),
      {
        layer,
        showSolderMask: true,
        width: 800,
        height: 400,
        viewport: { minX: -4, maxX: 4, minY: -2, maxY: 2 },
      },
    )
    const { pixels } = new Resvg(svg).render()
    function pixel(x: number, y: number) {
      const offset =
        (Math.round((2 - y) * 100) * 800 + Math.round((x + 4) * 100)) * 4
      return Array.from(pixels.subarray(offset, offset + 4))
    }
    expect(pixel(0.75, 0)).toEqual(pixel(0, 0))
    expect(pixel(1.35, 0)).toEqual(pixel(-2, 0))
    expect(pixel(1.1, 0)).toEqual(pixel(-2, 0))
    expect(pixel(0, 0)).not.toEqual(pixel(-2, 0))
    return svg
  }

  const top = render("top")
  const bottom = render("bottom")
  expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">${top}<g transform="translate(0 400)">${bottom}</g></svg>`,
  ).toMatchSvgSnapshot(import.meta.path)
})
