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
        viewport: { minX: -4.25, maxX: 4.25, minY: -1.5, maxY: 2 },
      },
    )
    const { pixels } = new Resvg(svg, {
      font: { fontFiles: [fontFile], loadSystemFonts: false },
    }).render()
    return {
      svg,
      pixel(x: number, y: number) {
        const offset =
          (Math.round((2 - y) * 200) * 1700 + Math.round((x + 4.25) * 200)) * 4
        return Array.from(pixels.subarray(offset, offset + 4))
      },
    }
  }

  const top = render("top")
  const bottom = render("bottom")
  const plug = [12, 55, 33, 255]
  const tented = [18, 82, 50, 255]
  const drill = [255, 38, 226, 255]
  for (const view of [top, bottom]) {
    expect(view.pixel(-2, 0.425)).toEqual(tented)
    expect(view.pixel(-2, -0.675)).toEqual(tented)
    expect(view.pixel(2, 0.425)).toEqual(drill)
    expect(view.pixel(2, -0.675)).toEqual(drill)
    expect(view.pixel(-1.775, 0.425)).toEqual(tented)
  }
  const untented = circuit.map((element) =>
    element.type === "pcb_board"
      ? {
          ...element,
          default_via_tented_on_top: false,
          default_via_tented_on_bottom: false,
        }
      : element,
  )
  for (const view of [
    render("top", true, untented),
    render("bottom", true, untented),
  ]) {
    expect(view.pixel(-2, 0.425)).toEqual(plug)
    expect(view.pixel(-2, -0.675)).toEqual(plug)
    expect(view.pixel(2, 0.425)).toEqual(drill)
    expect(view.pixel(-1.775, 0.425)).toEqual(view.pixel(2.225, 0.425))
  }
  expect(render("top", false).pixel(-2, 0.425)).toEqual(drill)
  expect(render("bottom", false).pixel(-2, -0.675)).toEqual(drill)
  const unspecified = untented.map((element) =>
    element.type === "pcb_board"
      ? { ...element, default_via_plugged: undefined }
      : element,
  )
  expect(render("top", true, unspecified).pixel(-2, 0.425)).toEqual(drill)
  expect(circuit).toEqual(original)
  expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="1400">${top.svg}<g transform="translate(0 700)">${bottom.svg}</g></svg>`,
  ).toMatchSvgSnapshot(import.meta.path)
})
