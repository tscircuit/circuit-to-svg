import { Resvg } from "@resvg/resvg-js"
import { expect, test } from "bun:test"
import type { CircuitJson, PcbFabricationNotePath } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import visualFixture from "../fixtures/fabrication-path-fill.circuit.json"

const path: PcbFabricationNotePath = {
  type: "pcb_fabrication_note_path",
  pcb_fabrication_note_path_id: "filled-path",
  pcb_component_id: "component",
  layer: "top",
  route: [
    { x: 0, y: 0 },
    { x: 8, y: 0 },
    { x: 8, y: 4 },
    { x: 4, y: 4 },
    { x: 4, y: 8 },
    { x: 0, y: 8 },
  ],
  stroke_width: 0.5,
}
function render(overrides: Partial<PcbFabricationNotePath> = {}) {
  return (
    convertCircuitJsonToPcbSvg([{ ...path, ...overrides }], {
      includeVersion: false,
    }).match(/<path[^>]*class="pcb-fabrication-note-path"[^>]*>/)?.[0] ?? ""
  )
}

test("legacy fabrication paths are open and only stroked", () => {
  expect(render()).toContain('fill="none"')
  expect(render()).toContain('stroke="rgba(255,255,255,0.5)"')
  expect(render()).not.toContain(' Z"')
})

test("filled fabrication paths close implicitly and allow fill without stroke", () => {
  const svg = render({ is_filled: true, has_stroke: false, color: "#ff0000" })
  expect(svg).toContain('fill="#ff0000"')
  expect(svg).toContain('stroke="none"')
  expect(svg).toContain(' Z"')
  expect(svg).toBe(
    render({
      is_filled: true,
      has_stroke: false,
      color: "#ff0000",
      route: [...path.route, path.route[0]!],
    }),
  )
})

test("filled fabrication paths can retain their stroke and default color", () => {
  expect(render({ is_filled: true })).toContain('fill="rgb(255, 255, 255)"')
  expect(render({ is_filled: true })).toContain('stroke="rgb(255, 255, 255)"')
  expect(render({ has_stroke: false })).toContain('stroke="none"')
})

test("empty and single-point fabrication paths are ignored", () => {
  expect(render({ route: [], is_filled: true })).toBe("")
  expect(render({ route: [{ x: 0, y: 0 }], is_filled: true })).toBe("")
})

test("fabrication path fill modes visual snapshot", () => {
  const svg = convertCircuitJsonToPcbSvg(visualFixture as CircuitJson, {
    width: 800,
    height: 600,
    includeVersion: false,
    showFabricationNotes: true,
  })
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})

test("paint alpha is applied once to the whole fabrication path", () => {
  for (const color of [
    "rgba(255,0,0,0.5)",
    "#ff000080",
    "hsla(0,100%,50%,0.5)",
  ]) {
    const svg = render({ is_filled: true, color })
    expect(svg).toContain('fill="rgb(255, 0, 0)"')
    expect(svg).toContain('stroke="rgb(255, 0, 0)"')
    expect(Number(svg.match(/opacity="([^"]+)"/)![1])).toBeCloseTo(0.5, 2)
  }
})

test("rasterized filled edges and retraces have the same opacity as interiors", () => {
  for (const is_filled of [false, true]) {
    const element = render({ is_filled, color: "rgba(255,0,0,0.5)" })
      .replace(/d="[^"]*"/, 'd="M 20 20 L 80 20 L 80 80 L 20 20 L 80 80"')
      .replace(/stroke-width="[^"]*"/, 'stroke-width="10"')
    const image = new Resvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">${element.replace(/\/?>$/, "/>")}</svg>`,
    ).render()
    for (const [x, y] of [
      [50, 20],
      [78, 22],
      [50, 50],
    ]) {
      const offset = (y! * image.width + x!) * 4
      expect(Math.abs(image.pixels[offset]! - 128)).toBeLessThanOrEqual(1)
      expect(Math.abs(image.pixels[offset + 3]! - 128)).toBeLessThanOrEqual(1)
    }
  }
})

test("SVG context-dependent paints remain valid fabrication colors", () => {
  expect(render({ is_filled: true, color: "currentColor" })).toContain(
    'fill="currentColor"',
  )
})
