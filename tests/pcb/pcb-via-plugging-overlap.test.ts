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
        viewport: { minX: -10, maxX: 10, minY: -6, maxY: 6 },
      },
    )
    const { pixels } = new Resvg(svg, {
      font: { fontFiles: [fontFile], loadSystemFonts: false },
    }).render()
    return {
      svg,
      pixel(x: number, y: number) {
        const offset =
          (Math.round((6 - y) * 60) * 1200 + Math.round((x + 10) * 60)) * 4
        return Array.from(pixels.subarray(offset, offset + 4))
      },
    }
  }
  const top = render("top")
  const bottom = render("bottom")
  for (const view of [top, bottom]) {
    expect(view.pixel(-5.1, -0.5)).toEqual([201, 162, 110, 255])
    expect(view.pixel(-5.7, -0.5)).toEqual(view.pixel(-6, -0.5))
    expect(view.pixel(5, -0.5)).toEqual([255, 255, 255, 255])
  }
  expect(top.pixel(-4.8, -0.5)).toEqual(top.pixel(-3.8, -0.5))
  expect(bottom.pixel(-4.8, -0.5)).toEqual([201, 162, 110, 255])
  expect(bottom.pixel(-3.8, -0.5)).toEqual(bottom.pixel(-6, -0.5))
  expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1440">${top.svg}<g transform="translate(0 720)">${bottom.svg}</g></svg>`,
  ).toMatchSvgSnapshot(import.meta.path)
})
