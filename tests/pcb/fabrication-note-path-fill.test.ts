import { expect, test } from "bun:test"
import type { PcbFabricationNotePath } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"

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
  expect(render({ is_filled: true })).toContain('fill="rgba(255,255,255,0.5)"')
  expect(render({ is_filled: true })).toContain(
    'stroke="rgba(255,255,255,0.5)"',
  )
  expect(render({ has_stroke: false })).toContain('stroke="none"')
})

test("empty and single-point fabrication paths are ignored", () => {
  expect(render({ route: [], is_filled: true })).toBe("")
  expect(render({ route: [{ x: 0, y: 0 }], is_filled: true })).toBe("")
})
