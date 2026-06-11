import { parseSync, stringify } from "svgson"

function getSvgSize(svg: string): { width: number; height: number } {
  const parsed = parseSync(svg)
  return {
    width: Number.parseFloat(parsed.attributes.width ?? "1200"),
    height: Number.parseFloat(parsed.attributes.height ?? "600"),
  }
}

export function stackSvgComparison({
  schematicSvg,
  blockDiagramSvg,
}: {
  schematicSvg: string
  blockDiagramSvg: string
}): string {
  const schematic = parseSync(schematicSvg)
  const blockDiagram = parseSync(blockDiagramSvg)
  const schematicSize = getSvgSize(schematicSvg)
  const blockDiagramSize = getSvgSize(blockDiagramSvg)
  const labelHeight = 34
  const gap = 18
  const width = Math.max(schematicSize.width, blockDiagramSize.width)
  const blockDiagramY = labelHeight + schematicSize.height + gap + labelHeight
  const height = blockDiagramY + blockDiagramSize.height

  return stringify({
    type: "element",
    name: "svg",
    value: "",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      width: String(width),
      height: String(height),
      viewBox: `0 0 ${width} ${height}`,
    },
    children: [
      createLabel("Schematic", 16, 22),
      {
        type: "element",
        name: "g",
        value: "",
        attributes: { transform: `translate(0 ${labelHeight})` },
        children: schematic.children,
      },
      createLabel(
        "Block Diagram",
        16,
        labelHeight + schematicSize.height + gap + 22,
      ),
      {
        type: "element",
        name: "g",
        value: "",
        attributes: { transform: `translate(0 ${blockDiagramY})` },
        children: blockDiagram.children,
      },
    ],
  })
}

function createLabel(text: string, x: number, y: number) {
  return {
    type: "element" as const,
    name: "text",
    value: "",
    attributes: {
      x: String(x),
      y: String(y),
      fill: "#0f172a",
      "font-family": "sans-serif",
      "font-size": "18",
      "font-weight": "600",
    },
    children: [
      {
        type: "text" as const,
        name: "",
        value: text,
        attributes: {},
        children: [],
      },
    ],
  }
}
