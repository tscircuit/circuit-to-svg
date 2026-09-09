import { expect, test } from "bun:test"
import type { PcbSolderPaste } from "circuit-json"
import { convertCircuitJsonToSolderPasteMask } from "lib"
import { parseSync } from "svgson"
import {
  applyToPoint,
  compose,
  rotateDEG,
  translate,
} from "transformation-matrix"

const apertures = [
  { shape: "rect", width: 10, height: 2 },
  { shape: "circle", radius: 5 },
  { shape: "oval", width: 10, height: 2 },
  { shape: "pill", width: 10, height: 2, radius: 1 },
  { shape: "rotated_rect", width: 10, height: 2, ccw_rotation: 45 },
  { shape: "rotated_pill", width: 10, height: 2, radius: 1, ccw_rotation: 90 },
] as const

for (const aperture of apertures) {
  test(`standalone ${aperture.shape} solder paste fits inside the viewport`, () => {
    const paste: PcbSolderPaste = {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "paste_1",
      pcb_component_id: "component_1",
      layer: "top",
      x: 4,
      y: -3,
      ...aperture,
    }
    const svg = convertCircuitJsonToSolderPasteMask([paste], { layer: "top" })
    const node = parseSync(svg).children.find(
      (child) => child.attributes.class === "pcb-solder-paste",
    )!
    const attrs = node.attributes
    const width = Number(attrs.width ?? Number(attrs.rx ?? attrs.r) * 2)
    const height = Number(attrs.height ?? Number(attrs.ry ?? attrs.r) * 2)
    const x = Number(attrs.x ?? Number(attrs.cx) - width / 2)
    const y = Number(attrs.y ?? Number(attrs.cy) - height / 2)
    let corners = [
      { x, y },
      { x: x + width, y },
      { x, y: y + height },
      { x: x + width, y: y + height },
    ]
    if (attrs.transform) {
      const [tx, ty, angle] = attrs.transform
        .match(/-?[\d.]+(?:e[+-]?\d+)?/gi)!
        .map(Number)
      const matrix = compose(translate(tx!, ty!), rotateDEG(angle!))
      corners = corners.map((point) => applyToPoint(matrix, point))
    }
    for (const point of corners) {
      expect(point.x).toBeGreaterThan(0)
      expect(point.x).toBeLessThan(800)
      expect(point.y).toBeGreaterThan(0)
      expect(point.y).toBeLessThan(600)
    }
  })
}
