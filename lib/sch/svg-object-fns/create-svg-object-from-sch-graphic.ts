import type { SchematicGraphic } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { formatNumber } from "lib/utils/svg-object-utils"

interface GraphicViewport {
  x: number
  y: number
  width: number
  height: number
}

const SVG_MIMETYPE = "image/svg+xml"

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
  const href = getEmbeddedSvgHref(schematicGraphic)

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
    children: [
      {
        name: "image",
        type: "element",
        value: "",
        attributes: {
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

function getEmbeddedSvgHref(schematicGraphic: SchematicGraphic): string {
  const errorPrefix = `Unable to render schematic graphic "${schematicGraphic.schematic_graphic_id}"`
  const { asset, svg_content: svgContent } = schematicGraphic

  if (!asset) {
    if (svgContent !== undefined) return encodeSvgDataUrl(svgContent)
    throw new Error(`${errorPrefix}: asset or svg_content is required`)
  }

  if (getMediaType(asset.mimetype) !== SVG_MIMETYPE) {
    throw new Error(
      `${errorPrefix}: asset.mimetype must be "${SVG_MIMETYPE}" (received ${JSON.stringify(asset.mimetype)})`,
    )
  }

  const assetUrl = asset.url.trim()
  if (assetUrl.toLowerCase().startsWith("data:")) {
    validateSvgDataUrl(assetUrl, errorPrefix)
    return assetUrl
  }

  // convertCircuitJsonToSchematicSvg is synchronous. Core and other callers
  // can materialize a file or remote Asset by attaching its text here.
  if (svgContent !== undefined) return encodeSvgDataUrl(svgContent)

  throw new Error(
    `${errorPrefix}: asset.url must be an inline SVG data URL because circuit-to-svg cannot synchronously load ${JSON.stringify(asset.url)}`,
  )
}

function validateSvgDataUrl(dataUrl: string, errorPrefix: string): void {
  const match = dataUrl.match(/^data:([^,]*),(.*)$/is)
  if (!match) {
    throw new Error(`${errorPrefix}: asset.url is not a valid SVG data URL`)
  }

  const metadataParts = match[1]!.split(";").map((part) => part.trim())
  const dataUrlMediaType = getMediaType(metadataParts.shift() ?? "")
  if (dataUrlMediaType !== SVG_MIMETYPE) {
    throw new Error(
      `${errorPrefix}: asset.url must use the "${SVG_MIMETYPE}" media type`,
    )
  }

  const payload = match[2]!
  const isBase64 = metadataParts.some((part) => part.toLowerCase() === "base64")

  if (isBase64) {
    const encoded = payload.replace(/\s+/g, "")
    if (
      !/^(?:[a-z\d+/]{4})*(?:[a-z\d+/]{2}==|[a-z\d+/]{3}=)?$/i.test(encoded)
    ) {
      throw new Error(`${errorPrefix}: asset.url is not a valid SVG data URL`)
    }
    return
  }

  // Check percent escapes without retaining or parsing the decoded document.
  try {
    decodeURIComponent(payload)
  } catch (cause) {
    throw new Error(`${errorPrefix}: asset.url is not a valid SVG data URL`, {
      cause,
    })
  }
}

function encodeSvgDataUrl(svgContent: string): string {
  const bytes = new TextEncoder().encode(svgContent)
  let binary = ""
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }

  return `data:${SVG_MIMETYPE};base64,${btoa(binary)}`
}

function getMediaType(value: string): string {
  return (value.split(";", 1)[0] ?? "").trim().toLowerCase()
}
