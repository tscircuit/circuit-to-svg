import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

// 回転90度のカプセルで、固定線幅の外周まで収めます。
const wideRotatedPill: AnyCircuitElement[] = [
  {
    type: "pcb_silkscreen_pill",
    layer: "top",
    pcb_component_id: "pcb_component_0",
    pcb_silkscreen_pill_id: "pill_wide_90",
    center: { x: 0, y: 0 },
    width: 7.778,
    height: 1,
    ccw_rotation: 90,
  },
]

// 7.778×1mmの形状に固定半線幅0.05mmを含め、x±0.55・y±3.939mmです。
test("getComprehensivePcbBounds accounts for a rotated pcb_silkscreen_pill", () => {
  const bounds = getComprehensivePcbBounds(wideRotatedPill)
  expect(bounds.minX).toBeCloseTo(-0.55, 6)
  expect(bounds.maxX).toBeCloseTo(0.55, 6)
  expect(bounds.minY).toBeCloseTo(-3.939, 6)
  expect(bounds.maxY).toBeCloseTo(3.939, 6)
})

test("wide rotated silkscreen pill is not clipped by the svg viewport", () => {
  const svg = convertCircuitJsonToPcbSvg(wideRotatedPill)
  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
