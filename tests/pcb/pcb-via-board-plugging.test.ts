import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { fileURLToPath } from "node:url"
import { convertCircuitJsonToPcbSvg } from "lib"
import { circuit } from "./pcb-via-board-plugging.fixture"

test("standalone and route vias use their own board's plugging setting", () => {
  const original = structuredClone(circuit)
  const fontFile = fileURLToPath(
    new URL(
      "TscircuitAlphabet.ttf",
      import.meta.resolve("@tscircuit/alphabet"),
    ),
  )
  function render(
    layer: "top" | "bottom",
    showSolderMask = true,
    elements = circuit,
  ) {
    const svg = convertCircuitJsonToPcbSvg(
      elements.map((element) =>
        element.type === "pcb_note_text" && element.pcb_note_text_id === "view"
          ? {
              ...element,
              text: `${layer.toUpperCase()} VIEW - showSolderMask: ${showSolderMask}`,
            }
          : element,
      ),
      {
        layer,
        showSolderMask,
        width: 1700,
        height: 700,
        viewport: { minX: -17, maxX: 17, minY: -6, maxY: 8 },
      },
    )
    const { pixels } = new Resvg(svg, {
      font: { fontFiles: [fontFile], loadSystemFonts: false },
    }).render()
    return {
      svg,
      pixel(x: number, y: number) {
        const offset =
          (Math.round((8 - y) * 50) * 1700 + Math.round((x + 17) * 50)) * 4
        return Array.from(pixels.subarray(offset, offset + 4))
      },
    }
  }

  const top = render("top")
  const bottom = render("bottom")
  const plug = [201, 162, 110, 255]
  const drill = [255, 38, 226, 255]
  for (const view of [top, bottom]) {
    expect(view.pixel(-8, 1.7)).toEqual(plug)
    expect(view.pixel(-8, -2.7)).toEqual(plug)
    expect(view.pixel(8, 1.7)).toEqual(drill)
    expect(view.pixel(8, -2.7)).toEqual(drill)
    expect(view.pixel(-7.1, 1.7)).toEqual(view.pixel(8.9, 1.7))
  }
  expect(render("top", false).pixel(-8, 1.7)).toEqual(drill)
  expect(render("bottom", false).pixel(-8, -2.7)).toEqual(drill)
  const unspecified = circuit.map((element) =>
    element.type === "pcb_board"
      ? { ...element, default_via_plugged: undefined }
      : element,
  )
  expect(render("top", true, unspecified).pixel(-8, 1.7)).toEqual(drill)
  expect(circuit).toEqual(original)
  expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="1400">${top.svg}<g transform="translate(0 700)">${bottom.svg}</g></svg>`,
  ).toMatchSvgSnapshot(import.meta.path)
})
