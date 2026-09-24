import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { fileURLToPath } from "node:url"
import { convertCircuitJsonToPcbSvg } from "lib"
import { circuit } from "./pcb-via-plugging-overlap.fixture"

test("plugging preserves pad openings and overlapping silkscreen text on both faces", () => {
  const fontFile = fileURLToPath(
    new URL(
      "TscircuitAlphabet.ttf",
      import.meta.resolve("@tscircuit/alphabet"),
    ),
  )
  function render(layer: "top" | "bottom") {
    const svg = convertCircuitJsonToPcbSvg(
      circuit.map((element) =>
        element.type === "pcb_note_text" && element.pcb_note_text_id === "view"
          ? {
              ...element,
              text: `${layer.toUpperCase()} VIEW - showSolderMask: true`,
            }
          : element,
      ),
      {
        layer,
        showSolderMask: true,
        width: 1200,
        height: 720,
        colorOverrides: { silkscreen: { top: "#fff", bottom: "#fff" } },
        viewport: { minX: -2.5, maxX: 2.5, minY: -1.5, maxY: 1.5 },
      },
    )
    const { pixels } = new Resvg(svg, {
      font: { fontFiles: [fontFile], loadSystemFonts: false },
    }).render()
    return {
      svg,
      pixel(x: number, y: number) {
        const offset =
          (Math.round((1.5 - y) * 240) * 1200 + Math.round((x + 2.5) * 240)) * 4
        return Array.from(pixels.subarray(offset, offset + 4))
      },
    }
  }
  const top = render("top")
  const bottom = render("bottom")
  for (const view of [top, bottom]) {
    expect(view.pixel(-1.275, -0.125)).toEqual([12, 55, 33, 255])
    expect(view.pixel(-1.425, -0.125)).toEqual(view.pixel(-1.5, -0.125))
    expect(view.pixel(1.25, -0.125)).toEqual([255, 255, 255, 255])
  }
  expect(top.pixel(-1.2, -0.125)).toEqual(top.pixel(-0.95, -0.125))
  expect(bottom.pixel(-1.2, -0.125)).toEqual([12, 55, 33, 255])
  expect(bottom.pixel(-0.95, -0.125)).toEqual(bottom.pixel(-1.5, -0.125))
  expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1440">${top.svg}<g transform="translate(0 720)">${bottom.svg}</g></svg>`,
  ).toMatchSvgSnapshot(import.meta.path)
})
