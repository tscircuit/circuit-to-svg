import { Resvg } from "@resvg/resvg-js"
import type { SchematicText } from "circuit-json"
import { createSvgSchText } from "lib/sch/svg-object-fns/create-svg-objects-for-sch-text"
import { colorMap } from "lib/utils/colors"
import { stringifySvg } from "lib/utils/stringify-svg"
import { type INode, parseSync } from "svgson"
import {
  applyToPoint,
  compose,
  rotateDEG,
  scale,
  translate,
} from "transformation-matrix"

export function flattenSvg(node: INode): INode[] {
  return [node, ...node.children.flatMap(flattenSvg)]
}

export function createLabelDetail(svg: string, labelId: string): string {
  const document = parseSync(svg)
  const label = flattenSvg(document).find(
    (node) => node.attributes["data-schematic-text-id"] === labelId,
  )
  if (!label) throw new Error(`Missing board label ${labelId}`)
  document.attributes.viewBox = `${Number(label.attributes.x) - 70} ${Number(label.attributes.y) - 65} 280 160`
  document.attributes.width = "1120"
  document.attributes.height = "640"
  return stringifySvg(document)
}

// Measure actual rendered glyphs perpendicular to the wire, including rotation.
export function getLabelInkClearance(text: SchematicText): number {
  const pixelsPerUnit = 40 / text.font_size
  const transform = compose(
    translate(256, 256),
    scale(pixelsPerUnit, -pixelsPerUnit),
    translate(-text.position.x, -text.position.y),
  )
  const label = createSvgSchText({ elm: text, transform, colorMap })
  const svg = stringifySvg({
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: "512",
      height: "512",
    },
    children: [label],
    value: "",
  })
  const rendered = new Resvg(svg).render()
  const pixels = rendered.pixels
  const screenToLabel = compose(
    translate(256, 256),
    rotateDEG(-text.rotation),
    translate(-256, -256),
  )
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3]! < 32) continue
    const pixelIndex = offset / 4
    const point = applyToPoint(screenToLabel, {
      x: pixelIndex % rendered.width,
      y: Math.floor(pixelIndex / rendered.width),
    })
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }
  if (!Number.isFinite(minY)) throw new Error("Label rendered no visible ink")
  return text.anchor.startsWith("bottom") ? 256 - maxY : minY - 256
}
