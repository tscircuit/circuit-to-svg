import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

const points = [
  { x: 20, y: 10 },
  { x: 28, y: 10 },
  { x: 28, y: 12 },
  { x: 24, y: 16 },
  { x: 20, y: 16 },
]

const fixtures: AnyCircuitElement[] = [
  {
    type: "pcb_courtyard_circle",
    pcb_courtyard_circle_id: "circle",
    pcb_component_id: "component",
    layer: "top",
    center: { x: 24, y: 13 },
    radius: 4,
  },
  {
    type: "pcb_courtyard_polygon",
    pcb_courtyard_polygon_id: "polygon",
    pcb_component_id: "component",
    layer: "top",
    points,
  },
  {
    type: "pcb_courtyard_outline",
    pcb_courtyard_outline_id: "outline",
    pcb_component_id: "component",
    layer: "bottom",
    outline: points,
  },
]

for (const courtyard of fixtures) {
  test(`${courtyard.type} contributes to boardless bounds`, () => {
    const bounds = getComprehensivePcbBounds([courtyard])
    expect(bounds.hasBounds).toBe(true)
    expect(bounds.hasBoardBounds).toBe(false)
    expect(bounds.minX).toBe(20)
    expect(bounds.maxX).toBe(28)
    expect(bounds.minY).toBe(courtyard.type === "pcb_courtyard_circle" ? 9 : 10)
    expect(bounds.maxY).toBe(
      courtyard.type === "pcb_courtyard_circle" ? 17 : 16,
    )

    const svg = convertCircuitJsonToPcbSvg([courtyard], {
      showCourtyards: true,
    })
    expect(svg).toMatchSvgSnapshot(import.meta.path, `${courtyard.type}-bounds`)
  })
}

test("empty courtyard polygons and outlines do not create bounds", () => {
  const circuit: AnyCircuitElement[] = [
    { ...fixtures[1], points: [] } as AnyCircuitElement,
    { ...fixtures[2], outline: [] } as AnyCircuitElement,
  ]
  expect(getComprehensivePcbBounds(circuit).hasBounds).toBe(false)
})
