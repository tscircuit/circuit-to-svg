import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToPcbSvg } from "../../lib/pcb/convert-circuit-json-to-pcb-svg"

const scene = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    num_layers: 4,
    thickness: 1.6,
  },
  ...["top", "inner1", "bottom"].map((layer) => ({
    type: "pcb_trace",
    pcb_trace_id: layer,
    route: [
      { route_type: "wire", x: -5, y: 0, width: 2, layer },
      { route_type: "wire", x: 5, y: 0, width: 2, layer },
    ],
  })),
  ...["a", "b"].flatMap((net, i) => [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: net,
      shape: "rect",
      x: 0,
      y: 5 - i * 10,
      width: 2,
      height: 2,
      layer: "top",
    },
    {
      type: "pcb_via",
      pcb_via_id: net + "_via",
      x: -6,
      y: 5 - i * 10,
      outer_diameter: 2,
      hole_diameter: 1,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: net + "_hole",
      shape: "circle",
      x: 6,
      y: 5 - i * 10,
      outer_diameter: 2,
      hole_diameter: 1,
      layers: ["top", "bottom"],
    },
  ]),
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "silk",
    layer: "top",
    x1: -2,
    y1: 8,
    x2: 2,
    y2: 8,
    stroke_width: 1,
  },
] as AnyCircuitElement[]
const selected = ["top", "inner1", "bottom", "a", "a_via", "a_hole"]
const render = (options = {}) =>
  convertCircuitJsonToPcbSvg(scene, {
    width: 200,
    height: 200,
    viewport: { minX: -10, minY: -10, maxX: 10, maxY: 10 },
    backgroundColor: "transparent",
    xRayElementIds: selected,
    hiddenLayerOpacity: 0.05,
    ...options,
  })
const pixel = (svg: string, x: number, y: number) => {
  const result = new Resvg(svg).render()
  return [
    ...result.pixels.slice(
      (y * result.width + x) * 4,
      (y * result.width + x) * 4 + 4,
    ),
  ]
}
test("X-Ray retains selected copper and drills, dims other nets, and hides non-copper", () => {
  const svg = render()
  expect(pixel(svg, 100, 50)[3]).toBe(255)
  expect(pixel(svg, 100, 150)[3]).toBe(13)
  for (const x of [40, 160]) {
    expect(pixel(svg, x, 50)).toEqual([255, 38, 226, 255])
    expect(pixel(svg, x, 150)[3]).toBe(0)
  }
  expect(svg).not.toContain('data-type="pcb_silkscreen_line"')
  expect(svg).not.toContain('data-type="pcb_board"')
  expect(pixel(render({ hiddenLayerOpacity: 0 }), 100, 150)[3]).toBe(0)
  expect(pixel(render({ hiddenLayerOpacity: 1 }), 100, 150)[3]).toBe(255)
})
test("X-Ray preserves frontmost layer order and supports multiple selected nets", () => {
  for (const [layer, color] of [
    ["top", [200, 52, 52, 255]],
    ["inner1", [255, 140, 0, 255]],
    ["bottom", [77, 127, 196, 255]],
  ] as const)
    expect(pixel(render({ layer }), 100, 100)).toEqual([...color])
  const both = render({ xRayElementIds: [...selected, "b", "b_via", "b_hole"] })
  expect(pixel(both, 100, 150)[3]).toBe(255)
  expect(pixel(both, 40, 150)).toEqual([255, 38, 226, 255])
})
test("Empty X-Ray selection preserves normal output and invalid opacity is rejected", () => {
  const options = { width: 200, height: 200 }
  expect(
    convertCircuitJsonToPcbSvg(scene, { ...options, xRayElementIds: [] }),
  ).toBe(convertCircuitJsonToPcbSvg(scene, options))
  expect(() => render({ hiddenLayerOpacity: -0.1 })).toThrow("between 0 and 1")
})

test("X-Ray exposes selected trace segments that ordinary rendering hides inside pours", () => {
  const flagged = scene.map((el) =>
    el.type === "pcb_trace"
      ? {
          ...el,
          route: el.route.map((point) => ({
            ...point,
            is_inside_copper_pour: true,
          })),
        }
      : el,
  )
  const svg = convertCircuitJsonToPcbSvg(flagged, {
    width: 200,
    height: 200,
    viewport: { minX: -10, minY: -10, maxX: 10, maxY: 10 },
    backgroundColor: "transparent",
    xRayElementIds: ["top"],
    hiddenLayerOpacity: 0,
  })
  expect(pixel(svg, 100, 100)).toEqual([200, 52, 52, 255])
})
