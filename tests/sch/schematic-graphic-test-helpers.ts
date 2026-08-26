import type { AnyCircuitElement, Asset, SchematicGraphic } from "circuit-json"
import { readFileSync } from "node:fs"
import type { INode } from "svgson"

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
}: {
  id: string
  sheetId?: string
  svgContent: string
}): SchematicGraphic {
  return {
    type: "schematic_graphic",
    schematic_graphic_id: id,
    ...(sheetId ? { schematic_sheet_id: sheetId } : {}),
    asset: svgAsset(svgContent),
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
): INode | undefined {
  if (node.attributes[attributeName] !== undefined) return node

  for (const child of node.children) {
    const match = findElement(child, attributeName)
    if (match) return match
  }

  return undefined
}

export function findElements(node: INode, attributeName: string): INode[] {
  return [
    ...(node.attributes[attributeName] !== undefined ? [node] : []),
    ...node.children.flatMap((child) => findElements(child, attributeName)),
  ]
}

export function findElementWithName(
  node: INode,
  name: string,
): INode | undefined {
  if (node.name === name) return node
  for (const child of node.children) {
    const match = findElementWithName(child, name)
    if (match) return match
  }
  return undefined
}

export function getNestedSvg(graphic: INode): INode {
  const nestedSvg = graphic.children.find((child) => child.name === "svg")
  if (!nestedSvg)
    throw new Error("Expected schematic graphic to contain an SVG")
  return nestedSvg
}

export function getGraphicNamespace(graphic: INode): string {
  const namespace = graphic.attributes.class
    ?.split(/\s+/)
    .find((className) => className !== "schematic-graphic")
  if (!namespace) throw new Error("Expected schematic graphic namespace class")
  return namespace
}

export function collectAttributeValues(
  node: INode,
  attributeName: string,
): string[] {
  return [
    ...(node.attributes[attributeName]
      ? [node.attributes[attributeName]!]
      : []),
    ...node.children.flatMap((child) =>
      collectAttributeValues(child, attributeName),
    ),
  ]
}

export function collectTextFromElements(
  node: INode,
  elementName: string,
): string {
  return [
    ...(node.name === elementName ? [getNodeText(node)] : []),
    ...node.children.map((child) =>
      collectTextFromElements(child, elementName),
    ),
  ].join("")
}

export function getNodeText(node: INode): string {
  return [
    ...(node.type === "text" ? [node.value] : []),
    ...node.children.map(getNodeText),
  ].join("")
}

export function stringifyTree(node: INode): string {
  const attributes = Object.entries(node.attributes)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ")
  return `<${node.name}${attributes ? ` ${attributes}` : ""}>${node.children
    .map(stringifyTree)
    .join("")}</${node.name}>`
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
