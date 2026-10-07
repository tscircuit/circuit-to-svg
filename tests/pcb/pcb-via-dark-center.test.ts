import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToPcbSvg } from "lib"
import { circuit } from "./pcb-via-dark-center.fixture"

function render(
  layer: "top" | "bottom",
  showSolderMask = true,
  maskColor?: string,
) {
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    layer,
    showSolderMask,
    width: 1000,
    height: 500,
    viewport: { minX: -10, maxX: 10, minY: -5, maxY: 5 },
    colorOverrides: maskColor
      ? {
          soldermaskWithCopperUnderneath: { top: maskColor, bottom: maskColor },
        }
      : undefined,
  })
  const { pixels } = new Resvg(svg).render()
  return {
    svg,
    pixel(x: number, y: number) {
      const offset =
        (Math.round((5 - y) * 50) * 1000 + Math.round((x + 10) * 50)) * 4
      return Array.from(pixels.subarray(offset, offset + 4))
    },
  }
}

for (const layer of ["top", "bottom"] as const) {
  test(`${layer} view darkens only tented, unplugged via centers`, async () => {
    const original = structuredClone(circuit)
    const view = render(layer)
    const copper = render(layer, false)
    const isTop = layer === "top"
    const tentedX = isTop ? -7 : -3
    const pluggedX = isTop ? 3 : 7

    // Explicit per-side overrides take precedence over the owning board.
    expect(view.pixel(tentedX, 1.5)).not.toEqual(
      view.pixel(tentedX + 0.75, 1.5),
    )
    expect(view.pixel(pluggedX, 1.5)).toEqual(view.pixel(pluggedX + 0.75, 1.5))
    expect(view.pixel(isTop ? -3 : -7, 1.5)).toEqual(copper.pixel(-7, 1.5))
    expect(view.pixel(isTop ? 7 : 3, 1.5)).toEqual(copper.pixel(3, 1.5))

    // Route-only vias use the same appearance and their own board's plugging setting.
    expect(view.pixel(-7, -1.5)).toEqual(view.pixel(tentedX, 1.5))
    expect(view.pixel(3, -1.5)).toEqual(view.pixel(pluggedX, 1.5))

    // The exposed pad clips both the annular mask and the center shading.
    expect(view.pixel(-3.25, -1.5)).toEqual(copper.pixel(-3.25, -1.5))
    expect(view.pixel(-2.75, -1.5)).toEqual(view.pixel(tentedX, 1.5))
    expect(view.pixel(-2.25, -1.5)).toEqual(view.pixel(tentedX + 0.75, 1.5))
    expect(copper.pixel(tentedX, 1.5)).toEqual(copper.pixel(pluggedX, 1.5))
    expect(circuit).toEqual(original)
    expect(view.svg).toMatchSvgSnapshot(
      import.meta.path,
      `via-dark-center-${layer}`,
    )
  })
}

test("center shading follows custom mask colors", () => {
  for (const color of ["#80c0f0", "#ffffff", "#202020"]) {
    const view = render("top", true, color)
    const center = view.pixel(-7, 1.5)
    const ring = view.pixel(-6.25, 1.5)
    for (let channel = 0; channel < 3; channel++) {
      expect(
        Math.abs(center[channel]! - ring[channel]! / 2),
      ).toBeLessThanOrEqual(1)
    }
    expect(center[3]).toBe(255)
    expect(view.pixel(3, 1.5)).toEqual(ring)
  }
})

test("transparent mask colors do not add a dark center", () => {
  const view = render("top", true, "transparent")
  expect(view.pixel(-7, 1.5)).toEqual(view.pixel(3, 1.5))
  expect(view.pixel(-7, -1.5)).toEqual(view.pixel(3, -1.5))
})
