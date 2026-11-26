import { Resvg } from "@resvg/resvg-js"
import { fileURLToPath } from "node:url"
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
export function getLabelInkClearance(
  text: SchematicText,
  attachment = text.position,
): number {
  const pixelsPerUnit = 40 / text.font_size
  const transform = compose(
    translate(512, 512),
    scale(pixelsPerUnit, -pixelsPerUnit),
    translate(-attachment.x, -attachment.y),
  )
  const label = createSvgSchText({ elm: text, transform, colorMap })
  const svg = stringifySvg({
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: "1024",
      height: "1024",
    },
    children: [label],
    value: "",
  })
  const rendered = new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      defaultFontFamily: "Noto Sans",
      sansSerifFamily: "Noto Sans",
      fontFiles: [
        fileURLToPath(
          new URL(
            "./assets/inline-label-clearance/NotoSans-Regular.ttf",
            import.meta.url,
          ),
        ),
      ],
    },
  }).render()
  const pixels = rendered.pixels
  const screenToLabel = compose(
    translate(512, 512),
    rotateDEG(-text.rotation),
    translate(-512, -512),
  )
  let maxY = Number.NEGATIVE_INFINITY
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3]! < 32) continue
    const pixelIndex = offset / 4
    const point = applyToPoint(screenToLabel, {
      x: pixelIndex % rendered.width,
      y: Math.floor(pixelIndex / rendered.width),
    })
    maxY = Math.max(maxY, point.y)
  }
  if (!Number.isFinite(maxY)) throw new Error("Label rendered no visible ink")
  return 512 - maxY
}

export function getLegacyTextPlacement(text: SchematicText): SchematicText {
  return {
    ...text,
    anchor: text.anchor.endsWith("left")
      ? "left"
      : text.anchor.endsWith("right")
        ? "right"
        : "center",
    position: applyToPoint(
      compose(
        translate(text.position.x, text.position.y),
        rotateDEG(-text.rotation),
        translate(0, text.font_size / 2),
      ),
      { x: 0, y: 0 },
    ),
  }
}
