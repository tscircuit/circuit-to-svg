import type { SchematicGraphic } from "circuit-json"

const SVG_MIMETYPE = "image/svg+xml"

export function getEmbeddedSchematicGraphicHref(
  schematicGraphic: SchematicGraphic,
): string {
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
  const base64Index = metadataParts.findIndex(
    (part) => part.toLowerCase() === "base64",
  )
  const isBase64 = base64Index !== -1

  if (isBase64 && base64Index !== metadataParts.length - 1) {
    throw new Error(
      `${errorPrefix}: asset.url must place "base64" as its final metadata token`,
    )
  }

  if (isBase64) {
    const encoded = payload.replace(/\s+/g, "")
    if (
      !/^(?:[a-z\d+/]{4})*(?:[a-z\d+/]{2}==|[a-z\d+/]{3}=)?$/i.test(encoded)
    ) {
      throw new Error(`${errorPrefix}: asset.url is not a valid SVG data URL`)
    }
    return
  }

  if (payload.includes("#")) {
    throw new Error(
      `${errorPrefix}: asset.url must percent-encode "#" in a non-base64 SVG data URL`,
    )
  }

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

function getMediaType(mimetype: string): string {
  return (mimetype.split(";", 1)[0] ?? "").trim().toLowerCase()
}
