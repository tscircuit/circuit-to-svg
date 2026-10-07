import type { SchematicGraphic } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { formatNumber } from "lib/utils/svg-object-utils"
import { createInlineRasterSchematicSvg } from "./create-inline-raster-schematic-svg"
import { getEmbeddedSchematicGraphicHref } from "./get-embedded-schematic-graphic-href"

interface GraphicViewport {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Render a schematic graphic as an SVG image. Keeping the supplied SVG inside
 * a data URL means its document tree, IDs, and styles stay isolated from the
 * generated schematic without circuit-to-svg parsing or rewriting its markup.
 * The content must therefore be a complete standalone SVG document, including
 * `xmlns="http://www.w3.org/2000/svg"` on its root element.
 */
export function createSvgObjectFromSchematicGraphic({
  schematicGraphic,
  viewport,
}: {
  schematicGraphic: SchematicGraphic
  viewport: GraphicViewport
}): SvgObject {
  const href = getEmbeddedSchematicGraphicHref(schematicGraphic)
  const inlineRasterSvg = createInlineRasterSchematicSvg({
    svgDataUrl: href,
    viewport,
  })

  return {
    name: "g",
    type: "element",
    value: "",
    attributes: {
      class: "schematic-graphic",
      "pointer-events": "none",
      "data-circuit-json-type": "schematic_graphic",
      "data-schematic-graphic-id": schematicGraphic.schematic_graphic_id,
      ...(schematicGraphic.schematic_sheet_id
        ? {
            "data-schematic-sheet-id": schematicGraphic.schematic_sheet_id,
          }
        : {}),
    },
    children: inlineRasterSvg
      ? [inlineRasterSvg]
      : [
          {
            name: "image",
            type: "element",
            value: "",
            attributes: {
              // Use the SVG 2 href attribute supported by browsers and Resvg.
              href,
              x: formatNumber(viewport.x),
              y: formatNumber(viewport.y),
              width: formatNumber(viewport.width),
              height: formatNumber(viewport.height),
              preserveAspectRatio: "xMidYMid meet",
              overflow: "hidden",
              "pointer-events": "none",
            },
            children: [],
          },
        ],
  }
}
