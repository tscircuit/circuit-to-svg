import type { AnyCircuitElement, Asset, SchematicGraphic } from "circuit-json"
import { readFileSync } from "node:fs"
import { parseSync, type INode } from "svgson"

export const systemBlockDiagramSvg = readFileSync(
  new URL("./assets/system-block-diagram.svg", import.meta.url),
  "utf8",
)

export function schematicSheet(
  id: string,
  sheetIndex: number,
): AnyCircuitElement {
  return {
    type: "schematic_sheet",
    schematic_sheet_id: id,
    sheet_index: sheetIndex,
  } as AnyCircuitElement
}

export function schematicGraphic({
  id,
  sheetId,
  svgContent,
  width,
  height,
}: {
  id: string
  sheetId?: string
  svgContent: string
  width?: number
  height?: number
}): SchematicGraphic {
  return {
    type: "schematic_graphic",
    schematic_graphic_id: id,
    ...(sheetId ? { schematic_sheet_id: sheetId } : {}),
    asset: svgAsset(svgContent),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  }
}

export function getRenderedGraphicViewport(svg: string): {
  x: number
  y: number
  width: number
  height: number
} {
  const graphic = findElement(parseSync(svg), "data-schematic-graphic-id")
  if (!graphic) throw new Error("Expected rendered schematic graphic")
  const image = getEmbeddedImage(graphic)
  return {
    x: Number(image.attributes.x),
    y: Number(image.attributes.y),
    width: Number(image.attributes.width),
    height: Number(image.attributes.height),
  }
}

export function svgAsset(
  svgContent: string,
  encoding: "percent" | "base64" = "percent",
): Asset {
  return {
    project_relative_path: "inline",
    mimetype: "image/svg+xml",
    url:
      encoding === "base64"
        ? `data:image/svg+xml;base64,${Buffer.from(svgContent).toString("base64")}`
        : `data:image/svg+xml,${encodeURIComponent(svgContent)}`,
  }
}

export function findElement(
  node: INode,
  attributeName: string,
  attributeValue?: string,
): INode | undefined {
  if (
    node.attributes[attributeName] !== undefined &&
    (attributeValue === undefined ||
      node.attributes[attributeName] === attributeValue)
  ) {
    return node
  }

  for (const child of node.children) {
    const match = findElement(child, attributeName, attributeValue)
    if (match) return match
  }

  return undefined
}

export function getEmbeddedImage(graphic: INode): INode {
  const image = graphic.children.find((child) => child.name === "image")
  if (!image) throw new Error("Expected schematic graphic to contain an image")
  return image
}

export function decodeSvgDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/svg\+xml(?:;[^,]*)?,(.*)$/is)
  if (!match) throw new Error("Expected an SVG data URL")

  const payload = match[1]!
  const metadata = dataUrl.slice(0, dataUrl.indexOf(",")).toLowerCase()
  return metadata.endsWith(";base64")
    ? Buffer.from(payload, "base64").toString("utf8")
    : decodeURIComponent(payload)
}

export function readPixel(
  pixels: Buffer,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const offset = (y * width + x) * 4
  return [
    pixels[offset] ?? 0,
    pixels[offset + 1] ?? 0,
    pixels[offset + 2] ?? 0,
    pixels[offset + 3] ?? 0,
  ]
}
