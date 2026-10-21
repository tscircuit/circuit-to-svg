import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

for (const [rotation, halfWidth, halfHeight] of [
  [0, 4, 1],
  [90, 1, 4],
  [-45, Math.sqrt(8.5), Math.sqrt(8.5)],
  [45, Math.sqrt(8.5), Math.sqrt(8.5)],
] as const) {
  test(`silkscreen oval bounds at ${rotation} degrees`, () => {
    const circuit: AnyCircuitElement[] = [
      {
        type: "pcb_silkscreen_oval",
        pcb_silkscreen_oval_id: "oval",
        pcb_component_id: "component",
        center: { x: 12, y: -7 },
        radius_x: 4,
        radius_y: 1,
        ccw_rotation: rotation,
        layer: "top",
      },
    ]
    const bounds = getComprehensivePcbBounds(circuit)
    expect(bounds.minX).toBeCloseTo(12 - halfWidth)
    expect(bounds.maxX).toBeCloseTo(12 + halfWidth)
    expect(bounds.minY).toBeCloseTo(-7 - halfHeight)
    expect(bounds.maxY).toBeCloseTo(-7 + halfHeight)

    const svg = convertCircuitJsonToPcbSvg(circuit)
    expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      `silkscreen-oval-bounds-${rotation}-degrees`,
    )
  })
}
