import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { Resvg } from "@resvg/resvg-js"
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
      whitePixelCountInCircle(x: number, y: number, radius = 0.65) {
        const centerX = Math.round((x + 12) * 50)
        const centerY = Math.round((5 - y) * 50)
        const radiusPx = Math.round(radius * 50)
        let count = 0
        for (let dy = -radiusPx; dy <= radiusPx; dy++) {
          for (let dx = -radiusPx; dx <= radiusPx; dx++) {
            if (dx * dx + dy * dy > radiusPx * radiusPx) continue
            const offset = ((centerY + dy) * 1200 + centerX + dx) * 4
            if (
              pixels[offset] === 255 &&
              pixels[offset + 1] === 255 &&
              pixels[offset + 2] === 255 &&
              pixels[offset + 3] === 255
            ) {
              count++
            }
          }
        }
        return count
      },
    }
  }
  const top = render("top")
  const bottom = render("bottom")
  expect(top.whitePixelCountInCircle(-8, -0.8)).toBeGreaterThan(0)
  expect(top.whitePixelCountInCircle(0, -0.8)).toBe(0)
  expect(top.whitePixelCountInCircle(8, -0.8)).toBeGreaterThan(0)
  expect(bottom.whitePixelCountInCircle(-8, -0.8)).toBeGreaterThan(0)
  expect(bottom.whitePixelCountInCircle(0, -0.8)).toBe(0)
  expect(bottom.whitePixelCountInCircle(8, -0.8)).toBe(0)
  expect(render("top", false).whitePixelCountInCircle(-8, -0.8)).toBe(0)
  expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000">${top.svg}<g transform="translate(0 500)">${bottom.svg}</g></svg>`,
  ).toMatchSvgSnapshot(import.meta.path)
})
