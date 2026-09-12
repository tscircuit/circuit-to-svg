import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"
import { parseSync } from "svgson"

test("a rotated silkscreen oval fits inside the SVG viewport", () => {
  const svg = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_silkscreen_oval",
      pcb_silkscreen_oval_id: "oval_90",
      pcb_component_id: "component_1",
      layer: "top",
      center: { x: 4, y: -3 },
      radius_x: 5,
      radius_y: 1,
      ccw_rotation: 90,
    },
  ])
  const { cx, cy, rx, ry, transform } = parseSync(svg).children.find(
    (node) => node.name === "ellipse",
  )!.attributes

  expect(transform).toBe(`rotate(-90 ${cx} ${cy})`)
  expect(Number(cx) - Number(ry)).toBeGreaterThan(0)
  expect(Number(cx) + Number(ry)).toBeLessThan(800)
  expect(Number(cy) - Number(rx)).toBeGreaterThan(0)
  expect(Number(cy) + Number(rx)).toBeLessThan(600)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
