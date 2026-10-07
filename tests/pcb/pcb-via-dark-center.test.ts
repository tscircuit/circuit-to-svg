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
    width: 600,
    height: 600,
    viewport: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
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
        (Math.round((5 - y) * 60) * 600 + Math.round((x + 5) * 60)) * 4
      return Array.from(pixels.subarray(offset, offset + 4))
    },
  }
}

for (const layer of ["top", "bottom"] as const) {
  test(`${layer} view darkens only tented via centers`, async () => {
    const original = structuredClone(circuit)
    const view = render(layer)
    const copper = render(layer, false)
    const isTop = layer === "top"
    const tentedX = isTop ? -2 : 2

    // Explicit per-side overrides take precedence over the owning board.
    expect(view.pixel(tentedX, 1.5)).not.toEqual(
      view.pixel(tentedX + 0.75, 1.5),
    )
    expect(view.pixel(isTop ? 2 : -2, 1.5)).toEqual(copper.pixel(-2, 1.5))

    // Route-only vias use the same per-side tenting appearance.
    expect(view.pixel(-2, -1.5)).toEqual(view.pixel(tentedX, 1.5))

    // The exposed pad clips both the annular mask and the center shading.
    expect(view.pixel(1.75, -1.5)).toEqual(copper.pixel(1.75, -1.5))
    expect(view.pixel(2.25, -1.5)).toEqual(view.pixel(tentedX, 1.5))
    expect(view.pixel(2.75, -1.5)).toEqual(view.pixel(tentedX + 0.75, 1.5))
    expect(copper.pixel(-2, 1.5)).toEqual(copper.pixel(2, 1.5))
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
    const center = view.pixel(-2, 1.5)
    const ring = view.pixel(-1.25, 1.5)
    for (let channel = 0; channel < 3; channel++) {
      expect(
        Math.abs(center[channel]! - ring[channel]! / 2),
      ).toBeLessThanOrEqual(1)
    }
    expect(center[3]).toBe(255)
  }
})

test("transparent mask colors do not add a dark center", () => {
  const view = render("top", true, "transparent")
  const copper = render("top", false)
  expect(view.pixel(-2, 1.5)).toEqual(copper.pixel(-2, 1.5))
  expect(view.pixel(-2, -1.5)).toEqual(copper.pixel(-2, -1.5))
})

test("context-dependent SVG mask paints are preserved", () => {
  for (const paint of [
    "currentColor",
    "var(--mask-color)",
    "url(#mask-paint)",
  ]) {
    const svg = convertCircuitJsonToPcbSvg(circuit, {
      showSolderMask: true,
      colorOverrides: {
        soldermaskWithCopperUnderneath: { top: paint },
      },
    })
    expect(svg).toContain(`fill="${paint}"`)
    expect(svg).toContain('class="pcb-via-tenting"')
  }
})

for (const layer of ["top", "bottom"] as const) {
  test(`${layer} semi-transparent tenting preserves center alpha`, () => {
    const svg = convertCircuitJsonToPcbSvg(
      [
        {
          type: "pcb_via",
          pcb_via_id: "translucent_via",
          x: 0,
          y: 0,
          outer_diameter: 2,
          hole_diameter: 1,
          layers: ["top", "bottom"],
          tented_on_top: true,
          tented_on_bottom: true,
        },
      ],
      {
        layer,
        showSolderMask: true,
        width: 200,
        height: 200,
        viewport: { minX: -2, maxX: 2, minY: -2, maxY: 2 },
        backgroundColor: "transparent",
        colorOverrides: {
          copper: { top: "transparent", bottom: "transparent" },
          drill: "transparent",
          soldermaskWithCopperUnderneath: {
            top: "rgba(128,192,240,0.5)",
            bottom: "rgba(128,192,240,0.5)",
          },
        },
      },
    )
    const { pixels } = new Resvg(svg).render()
    const center = Array.from(
      pixels.subarray((100 * 200 + 100) * 4, (100 * 200 + 100) * 4 + 4),
    )
    const ring = Array.from(
      pixels.subarray((100 * 200 + 140) * 4, (100 * 200 + 140) * 4 + 4),
    )
    expect(center[3]).toBe(ring[3])
    expect(Math.abs(center[3]! - 127.5)).toBeLessThanOrEqual(0.5)
    for (let channel = 0; channel < 3; channel++) {
      expect(
        Math.abs(center[channel]! - ring[channel]! / 2),
      ).toBeLessThanOrEqual(1)
    }
  })
}
