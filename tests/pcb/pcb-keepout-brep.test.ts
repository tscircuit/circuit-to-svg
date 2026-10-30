import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import type { AnyCircuitElement, PcbKeepoutBrep } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib"
import { getComprehensivePcbBounds } from "lib/pcb/get-pcb-bounds-from-circuit-json"

const keepout: PcbKeepoutBrep = {
  type: "pcb_keepout",
  shape: "brep",
  pcb_keepout_id: "annular_keepout",
  layers: ["top", "bottom"],
  description: "Exact circular boundary with an open center",
  brep_shape: {
    outer_ring: {
      vertices: [
        { x: 3, y: 0, bulge: -1 },
        { x: -3, y: 0, bulge: -1 },
      ],
    },
    inner_rings: [
      {
        vertices: [
          { x: 2, y: 0, bulge: 1 },
          { x: -2, y: 0, bulge: 1 },
        ],
      },
    ],
  },
}

test("BREP keepout bounds include semicircle extrema between vertices", () => {
  expect(getComprehensivePcbBounds([keepout])).toMatchObject({
    minX: -3,
    maxX: 3,
    minY: -3,
    maxY: 3,
    hasBounds: true,
  })
})

test("BREP keepout bounds respect asymmetric arc sweep and straight edges", () => {
  const shape: PcbKeepoutBrep = {
    ...keepout,
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -3, y: 1, bulge: 1 },
          { x: 3, y: 1 },
        ],
      },
      inner_rings: [],
    },
  }
  expect(getComprehensivePcbBounds([shape])).toMatchObject({
    minX: -3,
    maxX: 3,
    minY: -2,
    maxY: 1,
  })
})

test("renders exact BREP arcs and holes with layer filtering", () => {
  const circuit: AnyCircuitElement[] = [keepout]
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    width: 400,
    height: 400,
    layer: "top",
    backgroundColor: "transparent",
  })
  expect(svg).toContain('fill-rule="evenodd"')
  expect(svg).toContain(
    'data-description="Exact circular boundary with an open center"',
  )
  expect(svg).not.toContain('data-pcb-layer="bottom"')
  expect(svg).toMatchSvgSnapshot(import.meta.path)

  // The keepout-only scene has no underlying board: its center stays transparent.
  const image = new Resvg(svg).render()
  const { width, height, pixels } = image
  const alpha = (x: number, y: number) =>
    pixels[(Math.floor(y) * width + Math.floor(x)) * 4 + 3]!
  expect(alpha(width / 2, height / 2)).toBe(0)
  expect(pixels.some((value, index) => index % 4 === 3 && value > 0)).toBe(true)

  const allLayers = convertCircuitJsonToPcbSvg(circuit)
  expect(allLayers).toContain('data-pcb-layer="top"')
  expect(allLayers).toContain('data-pcb-layer="bottom"')
  const hiddenLayer = convertCircuitJsonToPcbSvg(circuit, { layer: "inner1" })
  expect(hiddenLayer).not.toContain('data-pcb-keepout-id="annular_keepout"')
})

test("renders a BREP keepout with straight sides and multiple holes", () => {
  const shape: PcbKeepoutBrep = {
    ...keepout,
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -5, y: -3 },
          { x: -5, y: 3 },
          { x: 5, y: 3 },
          { x: 5, y: -3 },
        ],
      },
      inner_rings: [
        {
          vertices: [
            { x: -1, y: 0, bulge: 1 },
            { x: -3, y: 0, bulge: 1 },
          ],
        },
        {
          vertices: [
            { x: 3, y: 0, bulge: 1 },
            { x: 1, y: 0, bulge: 1 },
          ],
        },
      ],
    },
  }
  const svg = convertCircuitJsonToPcbSvg([shape], { layer: "top" })
  expect(svg).toMatchSvgSnapshot(import.meta.path + "multiple-holes")
})
