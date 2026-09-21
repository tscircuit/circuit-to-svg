import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { fileURLToPath } from "node:url"
import { convertCircuitJsonToPcbSvg } from "lib"
import { circuit } from "./pcb-via-tenting-silkscreen.fixture"

test("silkscreen text remains visible over tented vias on the viewed face", () => {
  const alphabetFontPath = fileURLToPath(
    new URL(
      "TscircuitAlphabet.ttf",
      import.meta.resolve("@tscircuit/alphabet"),
    ),
  )

  function render(layer: "top" | "bottom", showSolderMask = true) {
    const svg = convertCircuitJsonToPcbSvg(
      circuit.map((element) =>
        element.type === "pcb_note_text" && element.pcb_note_text_id === "title"
          ? {
              ...element,
              text: `${layer.toUpperCase()} VIEW - showSolderMask: ${showSolderMask}\n${element.text}`,
            }
          : element,
      ),
      {
        layer,
        showSolderMask,
        colorOverrides: { silkscreen: { top: "#fff", bottom: "#fff" } },
        width: 1200,
        height: 500,
        viewport: { minX: -12, maxX: 12, minY: -5, maxY: 5 },
      },
    )
    const { pixels } = new Resvg(svg, {
      font: {
        fontFiles: [alphabetFontPath],
        loadSystemFonts: false,
      },
    }).render()
    return {
      svg,
      pixel(x: number, y: number) {
        const offset =
          (Math.round((5 - y) * 50) * 1200 + Math.round((x + 12) * 50)) * 4
        return Array.from(pixels.subarray(offset, offset + 4))
      },
    }
  }
  const top = render("top")
  const bottom = render("bottom")
  const white = [255, 255, 255, 255]
  expect(top.pixel(-8, -0.8)).toEqual(white)
  expect(top.pixel(0, -0.8)).not.toEqual(white)
  expect(top.pixel(8, -0.8)).toEqual(white)
  expect(bottom.pixel(-8, -0.8)).toEqual(white)
  expect(bottom.pixel(0, -0.8)).not.toEqual(white)
  expect(bottom.pixel(8, -0.8)).not.toEqual(white)
  expect(render("top", false).pixel(-8, -0.8)).not.toEqual(white)
  expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000">${top.svg}<g transform="translate(0 500)">${bottom.svg}</g></svg>`,
  ).toMatchSvgSnapshot(import.meta.path)
})
