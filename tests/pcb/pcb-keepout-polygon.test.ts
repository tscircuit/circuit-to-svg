import { expect, test } from "bun:test"
import type { PCBKeepout, PcbKeepoutPolygon } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"
import { createSvgObjectsFromPcbKeepout } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-keepout"
import type { PcbContext } from "lib/pcb/convert-circuit-json-to-pcb-svg"
import { compose, scale, translate } from "transformation-matrix"

test("renders filled concave keepouts with layer filtering and polygon bounds", () => {
  const keepout: PcbKeepoutPolygon = {
    type: "pcb_keepout",
    shape: "polygon",
    pcb_keepout_id: "concave_keepout",
    points: [
      { x: 10, y: 20 },
      { x: 16, y: 20 },
      { x: 16, y: 22 },
      { x: 12, y: 22 },
      { x: 12, y: 28 },
      { x: 10, y: 28 },
    ],
    layers: ["top", "inner1", "bottom"],
    description: "Filled L-shaped keepout",
  }
  expect(getComprehensivePcbBounds([keepout])).toMatchObject({
    minX: 10,
    minY: 20,
    maxX: 16,
    maxY: 28,
    hasBounds: true,
  })
  const ctx = {
    transform: compose(translate(100, 200), scale(2, -2)),
    colorMap: { keepout: "#ff6b6b" },
  } as PcbContext
  const objects = createSvgObjectsFromPcbKeepout(keepout, {
    ...ctx,
    layer: "inner1",
  })
  expect(objects).toHaveLength(2)
  expect(objects[0]?.attributes).toMatchObject({
    points: "120,160 132,160 132,156 124,156 124,144 120,144",
    fill: "rgba(255, 107, 107, 0.2)",
    "data-pcb-layer": "inner1",
    "data-description": keepout.description,
  })
  expect(objects[1]?.attributes.fill).toBe("url(#pcb-keepout-pattern)")
  expect(createSvgObjectsFromPcbKeepout(keepout, ctx)).toHaveLength(6)
  expect(
    createSvgObjectsFromPcbKeepout(keepout, { ...ctx, layer: "inner2" }),
  ).toEqual([])
  for (const points of [
    [],
    keepout.points.slice(0, 2),
    [{ x: NaN, y: 0 }, ...keepout.points],
  ]) {
    expect(createSvgObjectsFromPcbKeepout({ ...keepout, points }, ctx)).toEqual(
      [],
    )
    expect(getComprehensivePcbBounds([{ ...keepout, points }]).hasBounds).toBe(
      false,
    )
  }
  const outline: PCBKeepout = {
    type: "pcb_keepout",
    shape: "outline",
    pcb_keepout_id: "outline",
    layers: ["top"],
    outline: keepout.points,
    stroke_width: 0.2,
  }
  // Outline rendering is independent: its interior must not become a filled polygon.
  expect(createSvgObjectsFromPcbKeepout(outline, ctx)).toEqual([])
  expect(
    convertCircuitJsonToPcbSvg([keepout], {
      layer: "top",
      width: 400,
      height: 400,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
