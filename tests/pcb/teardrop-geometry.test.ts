import { expect, test } from "bun:test"
import type { PcbTraceRoutePointTeardrop } from "circuit-json"
import { getTeardropPolygon } from "../../lib/pcb/get-teardrop-polygon"

const taper: PcbTraceRoutePointTeardrop = {
  route_type: "teardrop",
  start: { x: 0, y: 0 },
  end: { x: 6, y: 0 },
  start_width: 3,
  end_width: 0.5,
  width_interpolation_mode: "linear",
  layer: "top",
}

test("linear taper uses full widths and flat end caps", () => {
  expect(getTeardropPolygon(taper)).toEqual([
    { x: 0, y: 1.5 },
    { x: 6, y: 0.25 },
    { x: 6, y: -0.25 },
    { x: 0, y: -1.5 },
  ])
})
test("smoothstep samples follow the specified profile with a bounded chord error", () => {
  const polygon = getTeardropPolygon({
    ...taper,
    width_interpolation_mode: "smoothstep",
  })
  const left = polygon.slice(0, polygon.length / 2)
  for (let i = 0; i < left.length - 1; i++) {
    const a = left[i]!,
      b = left[i + 1]!
    for (const fraction of [0.25, 0.5, 0.75]) {
      const t = (a.x + (b.x - a.x) * fraction) / 6
      const exact = (3 + (0.5 - 3) * t * t * (3 - 2 * t)) / 2
      expect(
        Math.abs(a.y + (b.y - a.y) * fraction - exact),
      ).toBeLessThanOrEqual(0.001003)
    }
  }
})
test("reversal and rotation preserve the copper region", () => {
  const reverse = getTeardropPolygon({
    ...taper,
    start: taper.end,
    end: taper.start,
    start_width: taper.end_width,
    end_width: taper.start_width,
  })
  const key = (p: { x: number; y: number }) =>
    `${p.x.toFixed(6)},${p.y.toFixed(6)}`
  expect(reverse.map(key).sort()).toEqual(
    getTeardropPolygon(taper).map(key).sort(),
  )
  expect(getTeardropPolygon({ ...taper, end: { x: 0, y: 6 } })).toEqual(
    getTeardropPolygon(taper).map((p) => ({ x: -p.y, y: p.x })),
  )
})
test("degenerate and nonfinite geometry emits no vertices", () => {
  for (const invalid of [
    { end: taper.start },
    { start_width: 0 },
    { end_width: NaN },
    { end: { x: Infinity, y: 0 } },
  ])
    expect(getTeardropPolygon({ ...taper, ...invalid })).toEqual([])
})

test("tessellation remains bounded for very large finite widths", () => {
  const polygon = getTeardropPolygon({
    ...taper,
    start_width: 1e308,
    width_interpolation_mode: "smoothstep",
  })
  expect(polygon.length).toBeLessThan(1230)
  expect(polygon.length).toBeGreaterThan(4)
  expect(
    polygon.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  ).toBe(true)
})

test("quadratic follows the selected concave profile in both directions", () => {
  for (const [start_width, end_width] of [
    [3, 0.5],
    [0.5, 3],
  ] as const) {
    const segment = {
      ...taper,
      start_width,
      end_width,
      width_interpolation_mode: "quadratic" as const,
    }
    const polygon = getTeardropPolygon(segment)
    const left = polygon.slice(0, polygon.length / 2)
    for (const p of left) {
      const t = p.x / 6
      const u = start_width < end_width ? t : 1 - t
      expect(p.y * 2).toBeCloseTo(0.5 + 2.5 * u * u, 10)
    }
    for (let i = 0; i < left.length - 1; i++) {
      const a = left[i]!,
        b = left[i + 1]!
      const t = (a.x + b.x) / 12
      const u = start_width < end_width ? t : 1 - t
      expect(
        Math.abs((a.y + b.y) / 2 - (0.5 + 2.5 * u * u) / 2),
      ).toBeLessThanOrEqual(0.001003)
    }
    const reversed = getTeardropPolygon({
      ...segment,
      start: segment.end,
      end: segment.start,
      start_width: end_width,
      end_width: start_width,
    })
    const key = (p: { x: number; y: number }) =>
      `${p.x.toFixed(6)},${p.y.toFixed(6)}`
    expect(reversed.map(key).sort()).toEqual(polygon.map(key).sort())
  }
})
test("equal-width quadratic reduces to a rectangle", () => {
  expect(
    getTeardropPolygon({
      ...taper,
      start_width: 0.5,
      end_width: 0.5,
      width_interpolation_mode: "quadratic",
    }),
  ).toEqual([
    { x: 0, y: 0.25 },
    { x: 6, y: 0.25 },
    { x: 6, y: -0.25 },
    { x: 0, y: -0.25 },
  ])
})
