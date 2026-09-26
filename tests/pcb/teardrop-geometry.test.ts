import { expect, test } from "bun:test"
import {
  getWireTaperPolygon,
  getWireTaperSegments,
  hasWireTaper,
  type WireTaperSegment,
} from "../../lib/pcb/get-wire-taper-polygon"

const taper: WireTaperSegment = {
  start: { x: 0, y: 0 },
  end: { x: 6, y: 0 },
  start_width: 3,
  end_width: 0.5,
  width_interpolation_mode: "linear",
  layer: "top",
}

test("linear taper uses full widths and flat end caps", () => {
  expect(getWireTaperPolygon(taper)).toEqual([
    { x: 0, y: 1.5 },
    { x: 6, y: 0.25 },
    { x: 6, y: -0.25 },
    { x: 0, y: -1.5 },
  ])
})
test("reversal and rotation preserve the copper region", () => {
  const reverse = getWireTaperPolygon({
    ...taper,
    start: taper.end,
    end: taper.start,
    start_width: taper.end_width,
    end_width: taper.start_width,
  })
  const key = (p: { x: number; y: number }) =>
    `${p.x.toFixed(6)},${p.y.toFixed(6)}`
  expect(reverse.map(key).sort()).toEqual(
    getWireTaperPolygon(taper).map(key).sort(),
  )
  expect(getWireTaperPolygon({ ...taper, end: { x: 0, y: 6 } })).toEqual(
    getWireTaperPolygon(taper).map((p) => ({ x: -p.y, y: p.x })),
  )
})
test("degenerate and nonfinite geometry emits no vertices", () => {
  for (const invalid of [
    { end: taper.start },
    { start_width: 0 },
    { end_width: NaN },
    { end: { x: Infinity, y: 0 } },
  ])
    expect(getWireTaperPolygon({ ...taper, ...invalid })).toEqual([])
})

test("tessellation remains bounded for very large finite widths", () => {
  const polygon = getWireTaperPolygon({
    ...taper,
    start_width: 1e308,
    width_interpolation_mode: "quadratic",
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
    const polygon = getWireTaperPolygon(segment)
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
    const reversed = getWireTaperPolygon({
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
    getWireTaperPolygon({
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

test("removed smoothstep profile produces no copper", () => {
  expect(
    getWireTaperSegments([
      {
        route_type: "wire",
        x: 0,
        y: 0,
        width: 3,
        start_width: 3,
        end_width: 0.5,
        width_interpolation_mode: "smoothstep",
        layer: "top",
      },
      { route_type: "wire", x: 6, y: 0, width: 0.5, layer: "top" },
    ]),
  ).toEqual([])
})

const wireTaper = {
  route_type: "wire",
  x: 0,
  y: 0,
  width: 0.6,
  start_width: 0.6,
  end_width: 0.2,
  width_interpolation_mode: "quadratic",
  layer: "top",
}
const endpoint = { route_type: "wire", x: 1, y: 0, width: 0.2, layer: "top" }
test("taper belongs to the outgoing wire segment only", () => {
  const route = [
    { ...endpoint, x: -1, width: 0.6 },
    wireTaper,
    endpoint,
    { ...endpoint, x: 2 },
  ]
  const segments = getWireTaperSegments(route)
  expect(segments).toHaveLength(1)
  expect(segments[0]!.start).toEqual({ x: 0, y: 0 })
  expect(segments[0]!.end).toEqual({ x: 1, y: 0 })
})
test("tapers terminate at a via or through-pad on the correct layer", () => {
  for (const end of [
    { route_type: "via", x: 1, y: 0, from_layer: "top", to_layer: "bottom" },
    {
      route_type: "through_pad",
      start: { x: 1, y: 0 },
      end: { x: 2, y: 0 },
      start_layer: "top",
      end_layer: "bottom",
      width: 0.2,
    },
  ]) {
    expect(getWireTaperSegments([wireTaper, end])).toHaveLength(1)
    expect(
      getWireTaperSegments([{ ...wireTaper, layer: "bottom" }, end]),
    ).toEqual([])
  }
})
test("malformed or terminal tapers never become constant-width fallbacks", () => {
  for (const start of [
    { ...wireTaper, end_width: undefined },
    { ...wireTaper, width: 0.4 },
    { ...wireTaper, start_width: 0 },
  ]) {
    expect(hasWireTaper(start)).toBe(true)
    expect(getWireTaperSegments([start, endpoint])).toEqual([])
  }
  expect(getWireTaperSegments([wireTaper])).toEqual([])
  expect(getWireTaperSegments([wireTaper, { ...endpoint, x: 0 }])).toEqual([])
})

test("taper is inside a pour only when both endpoints are inside", () => {
  const start = { ...wireTaper, is_inside_copper_pour: true }
  expect(
    getWireTaperSegments([start, endpoint])[0]?.is_inside_copper_pour,
  ).toBe(false)
  expect(
    getWireTaperSegments([
      start,
      { ...endpoint, is_inside_copper_pour: true },
    ])[0]?.is_inside_copper_pour,
  ).toBe(true)
})
