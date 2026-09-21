import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToPcbSvg } from "lib"
import { circuit } from "./pcb-via-tenting-silkscreen.fixture"

test("silkscreen remains visible over tented vias on the viewed face", () => {
  function render(layer: "top" | "bottom", showSolderMask = true) {
    const svg = convertCircuitJsonToPcbSvg(
      circuit.map((element) =>
        element.type === "pcb_note_text" && element.pcb_note_text_id === "title"
          ? {
              ...element,
              text: `${layer.toUpperCase()} VIEW - soldermask ON\n${element.text}`,
            }
          : element,
      ),
      {
        layer,
        showSolderMask,
        colorOverrides: { silkscreen: { top: "#fff", bottom: "#fff" } },
        width: 1200,
        height: 500,
        viewport: { minX: -6, maxX: 6, minY: -2.5, maxY: 2.5 },
      },
    )
    const { pixels } = new Resvg(svg).render()
    return {
      svg,
      pixel(x: number) {
        const offset = (250 * 1200 + (x + 6) * 100) * 4
        return Array.from(pixels.subarray(offset, offset + 4))
      },
    }
  }
  const top = render("top")
  const bottom = render("bottom")
  const white = [255, 255, 255, 255]
  expect(top.pixel(-3)).toEqual(white)
  expect(top.pixel(0)).not.toEqual(white)
  expect(top.pixel(3)).toEqual(white)
  expect(bottom.pixel(-3)).toEqual(white)
  expect(bottom.pixel(0)).not.toEqual(white)
  expect(bottom.pixel(3)).not.toEqual(white)
  expect(render("top", false).pixel(-3)).not.toEqual(white)
  expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000">${top.svg}<g transform="translate(0 500)">${bottom.svg}</g></svg>`,
  ).toMatchSvgSnapshot(import.meta.path)
})
