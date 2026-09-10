import type { SchematicTextPart } from "circuit-json"
import type { SvgObject } from "lib/svg-object"

const createSvgTextPart = (part: SchematicTextPart): SvgObject => ({
  type: "element",
  name: "tspan",
  value: "",
  attributes: part.is_overlined ? { "text-decoration": "overline" } : {},
  children: [
    {
      type: "text",
      name: "",
      value: part.text,
      attributes: {},
      children: [],
    },
  ],
})

export const createSvgTextParts = (parts: SchematicTextPart[]): SvgObject[] =>
  parts.filter((part) => part.text).map(createSvgTextPart)

export const createSvgTextPartLines = (
  parts: SchematicTextPart[],
): SvgObject[][] => {
  const lines: SvgObject[][] = [[]]

  for (const part of parts) {
    part.text.split("\n").forEach((text, index) => {
      if (index > 0) lines.push([])
      if (text) lines.at(-1)!.push(createSvgTextPart({ ...part, text }))
    })
  }

  return lines
}
